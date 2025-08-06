package validators

import (
	z "github.com/Oudwins/zog"
)

var AgendaEntrySchema = z.Struct(z.Shape{
	"Title":     z.String().Trim().Min(3).Required(),
	"Address":   z.String().Trim().Min(3).Required(),
	"StartDate": z.Time().Required(),
	"StartTime": z.Time().Required(),
	"VenueName": z.String().Trim().Min(3).Required(),
	"Place":     z.String().Trim().Min(3).Required(),
	"Category":  z.String().Trim().Min(3).Required(),
	"EndTime":   z.Time().Optional(),
	"EndDate":   z.Time().Optional(),
})

var FormSubmissionSchema = z.Struct(z.Shape{
	"ID":       z.String().Optional(),
	"FormData": AgendaEntrySchema,
	"Email":    z.String().Min(5).Email(),
	"Token":    z.String().Optional(),
})
