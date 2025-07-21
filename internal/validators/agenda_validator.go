package validators

import (
	z "github.com/Oudwins/zog"
)

var AgendaEntrySchema = z.Struct(z.Shape{
	"Title":     z.String().Trim().Required(),
	"Address":   z.String().Trim().Required(),
	"StartDate": z.Time().Required(),
	"StartTime": z.Time().Required(),
	"VenueName": z.String().Trim().Required(),
	"Place":     z.String().Trim().Required(),
	"Category":  z.String().Trim().Required(),
	"EndTime":   z.Time().Optional(),
	"EndDate":   z.Time().Optional(),
})

var FormSubmissionSchema = z.Struct(z.Shape{
	"ID":       z.String().Optional(),
	"FormData": AgendaEntrySchema,
	"Email":    z.String().Email(),
	"Token":    z.String().Optional(),
})
