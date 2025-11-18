package validators

import (
	"strings"

	z "github.com/Oudwins/zog"
)

var AgendaEntrySchema = z.Struct(z.Shape{
	"Title":     z.String().Trim().Min(1, z.Message("Titre ne peut pas être vide")).Required(z.Message("Titre ne peut pas être vide")),
	"Address":   z.String().Trim().Min(1, z.Message("Adresse ne peut pas être vide")).Required(z.Message("Adresse ne peut pas être vide")),
	"StartDate": z.Time().Required(z.Message("Date de début ne peut pas être vide")),
	"StartTime": z.Time().Required(z.Message("Heure de début ne peut pas être vide")),
	"VenueName": z.String().Trim().Min(1, z.Message("Nom du lieu ne peut pas être vide")).Required(z.Message("Nom du lieu ne peut pas être vide")),
	"Place":     z.String().Trim().Min(1, z.Message("Adresse ne peut pas être vide")).Required(z.Message("Adresse ne peut pas être vide")),
	"Price":     z.String().Trim().Min(1, z.Message("Prix ne peut pas être vide")).Required(z.Message("Prix ne peut pas être vide")),
	"Category":  z.String().Trim().Min(1, z.Message("Catégorie ne peut pas être vide")).Required(z.Message("Catégorie ne peut pas être vide")),
	"EndTime":   z.Time().Optional(),
	"EndDate":   z.Time().Optional(),
})

var FormSubmissionSchema = z.Struct(z.Shape{
	"ID":       z.String().Optional(),
	"FormData": AgendaEntrySchema,
	"Email":    z.String().Email().Required(z.Message("Email ne peut pas être vide")),
	"Token":    z.String().Optional(),
})

func FormatZogErrors(issues z.ZogIssueMap) map[string]string {
	sanitized := z.Issues.SanitizeMap(issues)
	errors := make(map[string]string)

	for field, msg := range sanitized {
		if field == "$first" {
			continue
		}
		fieldName := field
		if strings.Contains(field, ".") {
			parts := strings.Split(field, ".")
			fieldName = parts[len(parts)-1]
		}
		errors[strings.ToLower(fieldName)] = msg[0]
	}
	return errors
}
