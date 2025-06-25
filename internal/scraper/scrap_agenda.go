package scraper

import (
	"dpatrov/scraper/internal/types"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

type Record map[string]string

func New() *types.ScrapingTask {
	return &types.ScrapingTask{}
}

func LoadScrapingTaskFromFile(filePath string) (types.ScrapingTask, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Println(err)
		return types.ScrapingTask{}, err
	}
	var scrapingTask types.ScrapingTask
	err = json.Unmarshal(data, &scrapingTask)
	if err != nil {
		return types.ScrapingTask{}, err
	}
	return scrapingTask, nil
}

func HandleScrapTask(scrapTask types.ScrapingTask) Record {
	// will visit url
	// will extact data
	scraper := CreateScraper()
	result := map[string]string{}

	scraper.OnElement("html", func(el *NodeWrapper) {
		doc := goquery.NewDocumentFromNode(el.node)
		for selector, name := range scrapTask.ScrapingMap {
			selection := doc.Find(selector)
			if selection.Length() > 0 {
				result[name] = strings.TrimSpace(selection.Text())
			} else {
				fmt.Println("No node found with the specified selector")
			}
		}
	})
	scraper.Visit(scrapTask.Url)
	return result
}
