package test

import (
	"dpatrov/scraper/internal/scraper"
	"testing"

	"github.com/stretchr/testify/assert"
)

const TEMPLATE = `<div>
						<p>Links:</p>
						<ul class="main-list">
							<li><a href="foo">Proust</a></li>
							<li class="baz"><a href="http://gbd.db/bar/baz">Laure Murat</a></li>
							<li><a href="foo">Last</a></li>
						</ul>
					</div>
				`

func TestVisit(t *testing.T) {

	t.Run("Node Selector", func(t *testing.T) {
		// assert
		assert := assert.New(t)
		ns := new(scraper.NodeSelector)
		if nodeSelector, ok := ns.Parse("div#first"); ok {
			assert.Equal("div", nodeSelector.NodeType, "NodeSelector Error")
			assert.Equal("#first", nodeSelector.ID, "NodeSelector Error")
		}

		// use many classes
		nsWithClass := new(scraper.NodeSelector)
		if nodeSelector_2, ok := nsWithClass.Parse("#test.radv.test"); ok {
			assert.Equal("#test", nodeSelector_2.ID)
			assert.Equal([]string{".radv", ".test"}, nodeSelector_2.ClassNames)
		}
		// many ids
		selector_with_class := new(scraper.NodeSelector)
		if selector_2, ok := selector_with_class.Parse(".radical#pt-3.turbo#les"); ok {
			assert.Equal([]string{".radical", ".turbo"}, selector_2.ClassNames)
			assert.Equal("#pt-3", selector_2.ID)
		}
	})
	/*
		t.Run("SCRAPER VISIT", func(t *testing.T) {
			assert := assert.New(t)
			scraper := scraper.CreateScraper()
			was_called := false
			liCounter := 0
			liWClassCounter := 0
			ulMainList := 0

			// deal with  error
			scraper.OnElement("html", func(nw *scraper.NodeWrapper) {
				fmt.Println("current Node", nw.node.Type, nw.node.Data, nw.node.DataAtom, nw.node.Attr)
				was_called = true
			})

			// Handle id and classes
			scraper.OnElement("li", func(ul *NodeWrapper) {
				liCounter = liCounter + 1
			})

			scraper.OnElement("li.baz", func(li *NodeWrapper) {
				liWClassCounter = liWClassCounter + 1
				textContent := scraper.Text(li.node)
				assert.Equal("Laure Murat", textContent, "Get Text Content Error!")
			})

			scraper.OnElement("ul.main-list", func(ul *NodeWrapper) {
				count := 0
				scraper.Children(ul.node, "li").Each(func(nw *NodeWrapper) {
					t.Log(nw.Text(""))
					count = count + 1
				})
				assert.Equal(3, count, "Count should be 3!")
				ulMainList = ulMainList + 1
			})

			// visit the tree
			scraper.Visit(TEMPLATE)

			if liCounter != 2 {
				fmt.Println(liCounter)
				t.Error("li Callback should have been called twice!")
			}

			if liWClassCounter != 1 {
				t.Error("li.baz Callback should have been called once!")
			}

			if was_called == false {
				t.Error("Callback should have been called!")
			}

			if ulMainList != 1 {
				t.Error("ul.main-list Callback should have been called once!")
			}
		})

		/*	t.Run("SCRAPPER Seuil", func(t *testing.T) {
				assert := assert.New(t)
				singleBooksCount := 0

				type Book struct {
					Title     string
					Author    string
					PubDate   string
					coverPath string //implement download
				}

				type BookList []Book

				scraper := CreateScraper()
				var bookList BookList

				scraper.OnElement("html", func(node *NodeWrapper) {
					//fmt.Println(scraper.raw_html)
					assert.NotEqual(len(scraper.raw_html), 0)
				})

				scraper.OnElement(".single-book", func(nw *NodeWrapper) {
					book := new(Book)
					singleBooksCount = singleBooksCount + 1
					book.Title = nw.Find(".book-title").Eq(0).Text()
					book.Author = nw.Find(".author-name").Eq(0).Text()
					book.PubDate = nw.Find(".date-parution").Eq(0).Text()
					book.coverPath = ""
					bookList = append(bookList, *book)
				})

				scraper.Visit("https://www.seuil.com/catalogue/a-paraitre")
				assert.Equal(14, len(bookList))
				assert.Greater(singleBooksCount, 0)
				fmt.Println(bookList)
			})
	*/
}
