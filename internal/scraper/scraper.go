// make request to connect to AOP website
package scraper

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"slices"
	"sort"
	"strings"

	"golang.org/x/net/html"
)

/** TYPES **/
type NodeCollection []*html.Node

type NodeWrapper struct {
	node *html.Node
}

func (nw *NodeWrapper) Find(selector string) NodeCollection {
	var result NodeCollection
	stack := []*html.Node{nw.node}
	nodeSelector := new(NodeSelector) // New -> pointer
	ns, _ := nodeSelector.Parse(selector)

	for len(stack) > 0 {
		node := stack[len(stack)-1]
		stack = stack[:len(stack)-1] // new slice [ low:hight [
		if node.Type == html.ElementNode {
			if ns.Match(node) {
				result = append(result, node)
			}
			for currentNode := node.FirstChild; currentNode != nil; currentNode = currentNode.NextSibling {
				stack = append(stack, currentNode)
			}
		}
	}
	return result
}

func (nw *NodeWrapper) Text(selector ...string) string {
	if nw.node == nil {
		return ""
	}
	var result []string

	if len(selector) == 0 {
		nw.visit(nw.node, func(nw NodeWrapper) {
			if nw.node.Type == html.TextNode {
				result = append(result, strings.TrimSpace(nw.node.Data))
			}
		})
	}
	return strings.Join(result, " ")
}

func (nw *NodeWrapper) visit(node *html.Node, callback func(NodeWrapper)) {

	callback(NodeWrapper{node})
	for currentNode := node.FirstChild; currentNode != nil; currentNode = currentNode.NextSibling {
		nw.visit(currentNode, callback)
	}
}

type Callback func(*NodeWrapper)

/* Node Collection */
func (nc NodeCollection) Each(callback Callback) {
	for _, node := range nc {
		callback(&NodeWrapper{node})
	}
}

func (nc NodeCollection) Eq(number int) *NodeWrapper {
	nw := &NodeWrapper{}

	if len(nc) > 0 && nc[number] != nil {
		nw.node = nc[number]
	}
	return nw
}

/* Selector Infos */
type NodeSelector struct {
	Selector   string
	ID         string
	ClassNames []string
	NodeType   string
	weight     int
}

func (ns *NodeSelector) GetSelector() string {
	return ns.Selector
}

func (ns *NodeSelector) Parse(selector string) (*NodeSelector, bool) {

	exp := regexp.MustCompile(`^(\w+)?([#.](\w|\-)+)*$`)
	if !exp.MatchString(selector) {
		return ns, false
	}
	// save selector
	ns.Selector = selector

	nodeRegexp := regexp.MustCompile(`^(\w|\-)+`)
	idRegexp := regexp.MustCompile(`#(\w|\-)+`)
	classRegexp := regexp.MustCompile(`\.(\w|\-)+`)

	ns.NodeType = nodeRegexp.FindString(selector)
	matches := idRegexp.FindStringSubmatch(selector)
	if len(matches) > 1 {
		ns.ID = matches[0]
	}
	classeNames := []string{}
	classes := classRegexp.FindAllString(selector, -1)

	classeNames = append(classeNames, classes...)
	ns.ClassNames = classeNames

	if ns.ID != "" {
		ns.weight = 1000
	}

	if len(ns.ClassNames) > 0 {
		ns.weight = ns.weight + len(ns.ClassNames)*10
	}

	if len(ns.NodeType) > 0 {
		ns.weight = ns.weight + len(ns.NodeType)
	}

	return ns, true
}

func (ns *NodeSelector) Match(node *html.Node) bool {
	nodeType := node.Data
	classes := []string{}
	var ID string

	// Not the same node type
	if ns.NodeType != "" && ns.NodeType != nodeType {
		return false
	}
	for _, attr := range node.Attr {
		if attr.Key == "class" {
			classes = append(classes, strings.Split(attr.Val, " ")...)
		}
		if attr.Key == "ID" {
			ID = attr.Val
		}
	}

	// check ID
	if ns.ID != "" && ns.ID != ID {
		return false
	}

	// if classes exists, all the provided classes should be in current node classes
	for _, className := range ns.ClassNames {
		if !slices.Contains(classes, strings.Replace(className, ".", "", -1)) {
			return false
		}
	}

	return true
}

// Sortable: Sort BySelectorWeight
type BySelectorWeight []*NodeSelector

// Implement Sort Interface Len, Swap, Less
func (nsl BySelectorWeight) Len() int           { return len(nsl) }
func (nsl BySelectorWeight) Swap(i, j int)      { nsl[i], nsl[j] = nsl[j], nsl[i] }
func (nsl BySelectorWeight) Less(i, j int) bool { return nsl[i].weight > nsl[j].weight }

/************* SCRAPER ****************/
type Scraper struct {
	path           string
	raw_html       string
	node_callbacks map[string]Callback
	selectorList   []*NodeSelector
}

func (scraper *Scraper) parseSelector(selector string) *NodeSelector {
	nodeSelector := new(NodeSelector) // New -> pointer
	if ns, ok := nodeSelector.Parse(selector); ok {
		return ns
	}
	return nodeSelector
}

func (scraper *Scraper) FindMatchedSelector(node *html.Node) (*NodeSelector, bool) {

	for _, nodeSelector := range scraper.selectorList {
		if nodeSelector.Match(node) {
			return nodeSelector, true
		}
	}
	return nil, false
}

func (scraper *Scraper) nodeWalker(node *html.Node) {
	if node == nil {
		return // notify end
	}
	if node.Type == html.ElementNode {
		// Trying to find a match
		if nodeSelector, ok := scraper.FindMatchedSelector(node); ok {
			// Getting the callback for the match
			selector := nodeSelector.GetSelector()
			if nodefunc, exists := scraper.node_callbacks[selector]; exists {
				nodefunc(&NodeWrapper{node})
			}
		}
	}

	for currentNode := node.FirstChild; currentNode != nil; currentNode = currentNode.NextSibling {
		scraper.nodeWalker(currentNode)
	}
}

func (s *Scraper) Children(element *html.Node, selector string) NodeCollection {
	var nodes NodeCollection
	nodeSelector := s.parseSelector(selector)
	for currentNode := element.FirstChild; currentNode != nil; currentNode = currentNode.NextSibling {
		if nodeSelector.Match(currentNode) && currentNode.Parent == element {
			nodes = append(nodes, currentNode)
		}
	}
	return nodes
}

func (scraper *Scraper) Visit(url string) error {

	doc, err := scraper.Load(url)
	if err != nil {
		return err
	}
	// Sort selector by weight
	sort.Sort(BySelectorWeight(scraper.selectorList))
	// doc, err := html.Parse(strings.NewReader(content))
	scraper.nodeWalker(doc)
	return nil
}

func (s *Scraper) OnElement(selector string, callback Callback) {
	nodeSelector := s.parseSelector(selector)
	s.selectorList = append(s.selectorList, nodeSelector)
	s.node_callbacks[selector] = callback
}

func (s *Scraper) getNodeText(element *html.Node) string {
	if element.Type == html.TextNode {
		text := strings.TrimSpace(element.Data)
		return text
	}

	return ""
}

func (s *Scraper) Text(element *html.Node) string {
	var result []string
	if s.getNodeText(element) != "" {
		result = append(result, s.getNodeText(element))
	}
	for currentNode := element.FirstChild; currentNode != nil; currentNode = currentNode.NextSibling {
		result = append(result, s.Text(currentNode))
	}
	return strings.Join(result, " ")
}

func (s *Scraper) Load(url string) (*html.Node, error) {
	response, err := http.Get(url)
	s.path = url
	if err != nil {
		fmt.Println("Error fetching URL:", err)
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusOK {

		buf := new(strings.Builder)
		_, err = io.Copy(buf, response.Body) // Implement as an example
		if err != nil {
			log.Fatal(err)
		}
		s.raw_html = buf.String()
		node, err := html.Parse(strings.NewReader(s.raw_html)) // how to use iocopy
		if err != nil {
			log.Fatal(err) // call onError
		}
		if err != nil {
			return nil, err
		}
		return node, nil
	}

	return nil, errors.New("can't load URL")
}

func CreateScraper() *Scraper {
	scraper := &Scraper{path: "", raw_html: ""}
	scraper.node_callbacks = make(map[string]Callback)
	return scraper
}
