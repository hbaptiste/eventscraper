package main

import (
	"context"
	"database/sql"
	"dpatrov/scraper/internal/db"
	"dpatrov/scraper/internal/gendb"
	"dpatrov/scraper/internal/utils"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"golang.org/x/crypto/bcrypt"
)

var (
	username string
	password string
)

var rootCmd = &cobra.Command{
	Use:   "admin-cli",
	Short: "A CLI tool to manage database administration tasks.",
}
var createCmd = &cobra.Command{
	Use:   "create-admin",
	Short: "Create a new admin (superuser) in the database.",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Inside create-admin")
		fmt.Printf("username--> %s\n", username)
		fmt.Printf("password--> %s\n", password)
		if password == "" {
			fmt.Println("password can't be empty")
			return
		}
		if len(password) < 6 {
			fmt.Println("password is too short")
			return
		}
		db := db.InitDb()
		service := gendb.New(db)
		password, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			panic(1)
		}
		ctx := context.WithoutCancel(context.TODO())
		err = service.CreateUser(ctx, gendb.CreateUserParams{
			Username: username,
			Password: strings.Trim(string(password), ""),
			Role:     sql.NullString{String: "adm,admin,user", Valid: true},
			Status:   sql.NullInt64{Int64: 1, Valid: true},
		})
		if err != nil {
			fmt.Printf("Error %v", err)
			return
		}
		fmt.Printf("User %s created...", username)

	},
}
var checkEventsFacet = &cobra.Command{
	Use:   "check-events-facet",
	Short: "Check events",
	Run: func(cmd *cobra.Command, arg []string) {
		db := db.InitDb()
		//service := gendb.New(db)
		// eventFacet := utils.EventFacetCounts.New(db)
		eventFacet := utils.NewEventFacetCounts(db)

		facetCount, err := eventFacet.GetFacetCount(context.WithoutCancel(context.TODO()), gendb.GetAgendaCountFacetsParams{
			TodayEnd:      "2025-10-12",
			TodayStart:    "2025-10-12",
			WeekendEnd:    "2025-10-19",
			WeekendStart:  "2025-10-17",
			WeekEnd:       "2025-10-12",
			WeekStart:     "2025-10-06",
			NextWeekEnd:   "2025-10-24",
			NextWeekStart: "2025-10-26",
		})
		if err != nil {
			fmt.Printf("Error:: %+v", err)
			return
		}
		json, err := json.Marshal(facetCount)
		if err != nil {
			return
		}
		fmt.Printf("%s", string(json))
	},
}

func init() {
	rootCmd.AddCommand(createCmd)
	rootCmd.AddCommand(checkEventsFacet)
	// Define params
	createCmd.Flags().StringVarP(&username, "username", "u", "", "Username for the new admin user (required)")
	createCmd.Flags().StringVarP(&password, "password", "p", "", "Username for the new admin user (required)")
	createCmd.MarkFlagRequired(username)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
