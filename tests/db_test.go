package test

import (
	"context"
	"dpatrov/scraper/internal/db"
	"dpatrov/scraper/internal/db/repository"
	"fmt"
	"log"
	"math/rand"
	"testing"
	"time"
)

func TestDB(t *testing.T) {
	//db.DumpDB()
	myDb := db.InitDb()
	fmt.Println(myDb)
}

func TestCreateTask(t *testing.T) {
	myDb := db.InitDb()
	rand.New(rand.NewSource(time.Now().UnixNano()))
	randomInt := rand.Intn(100)

	myTask := &db.ScrapingTask{
		Type:        "agenda",
		Url:         fmt.Sprintf("http://google.fr/%s", fmt.Sprint(randomInt)),
		CreatedTime: time.Now(),
		ScrapingParams: db.Record{
			".h1":     "title",
			".desc":   "description",
			".poster": "poster",
		},
	}
	ctx := context.Background()
	taskRepository := repository.NewTaskRepository(myDb)
	taskRepository.Create(ctx, myTask)
}

func TestCreateAgendaEntry(t *testing.T) {
	myDb := db.InitDb()
	rand.New(rand.NewSource(time.Now().UnixNano()))
	randomInt := rand.Intn(100)
	agendaEntry := &db.AgendaEntry{
		Title:       "This is my title",
		Link:        fmt.Sprintf("http://google.fr/%s", fmt.Sprint(randomInt)),
		Price:       23,
		Address:     "You better know what's going on",
		Time:        time.Now().Format("2006-01-02"),
		Description: "this is my description",
		Status:      db.Status_Active,
		Tag:         []string{"test", "avenir"},
	}
	ctx := context.Background()
	agendaRepository := repository.NewAgendaRepository(myDb)
	agenda, err := agendaRepository.Create(ctx, agendaEntry)
	if err != nil {
		return
	}
	fmt.Printf("%+v\n", agenda)
}

func TestFindUserByName(t *testing.T) {
	myDB := db.InitDb()
	ctx := context.Background()
	useRepository := repository.NewUserRepository(myDB)
	user, err := useRepository.FindByName(ctx, "admin")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", user) //use assertion

}
