package repository

import (
	"context"
	"database/sql"
	"dpatrov/scraper/internal/db"
	"log"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db}
}

func (repo *UserRepository) FindByName(context context.Context, name string) (db.User, error) {
	var user db.User
	stm, err := repo.db.Prepare(`
					SELECT
					id,
					username,
					password,
					role,
					status,
					token_version
					FROM user WHERE username = ?`)
	if err != nil {
		log.Printf("%v", err)
		return user, err
	}
	defer stm.Close()

	err = stm.QueryRow(name).Scan(&user.ID, &user.Username, &user.Password, &user.Role, &user.Status, &user.TokenVersion)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("%v", err)
		}
		return user, err
	}
	return user, nil
}

func (repo *UserRepository) FindByID(context context.Context, id int) (db.User, error) {
	var user db.User
	stm, err := repo.db.Prepare("SELECT * FROM user WHERE id = ?")
	defer stm.Close()

	err = stm.QueryRow(id).Scan(&user.ID, &user.Username, &user.Password, &user.Role, &user.Status, &user.TokenVersion)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("[%v]", err)
		}
		return user, err
	}
	return user, nil

}
