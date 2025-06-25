package test

import (
	"dpatrov/scraper/internal/types"
	"fmt"
	"testing"

	"dpatrov/scraper/internal/scraper"

	"github.com/stretchr/testify/assert"
)

func TestLoadTaskFile(t *testing.T) {
	filepath := "fixtures/decadans.json"
	assert := assert.New(t)
	expectedTask := types.ScrapingTask{
		Name: "FIDH",
		Url:  "https://www.ladecadanse.ch/evenement.php?idE=479181",
		ScrapingMap: types.ScrapingMap{
			"#entete_contenu_titre > a:nth-child(2) > time:nth-child(1)": "time",
			"h3.left": "title",
			".adr":    "address",
		},
	}

	scraperTask, err := scraper.LoadScrapingTaskFromFile(filepath)
	if err != nil {
		fmt.Println("error", err)
	}
	fmt.Println(scraperTask)
	assert.Equal(expectedTask, scraperTask)
}
func TestVisistTask(t *testing.T) {
	filepath := "fixtures/decadans.json"
	scraperTask, err := scraper.LoadScrapingTaskFromFile(filepath)
	if err != nil {
		fmt.Println("error", err)
	}
	result := scraper.HandleScrapTask(scraperTask)
	// result
	fmt.Println(result)

}
