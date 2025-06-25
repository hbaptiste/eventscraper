package types

type ScrapingMap map[string]string

type ScrapingTask struct {
	Url         string      `json:"url"`
	Name        string      `json:"name"`
	ScrapingMap ScrapingMap `json:"scraping_map"`
}
