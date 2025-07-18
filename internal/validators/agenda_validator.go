package validators

import (
	"time"

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
	"EndTime": z.Time().TestFunc(func(dataPtr *time.Time, ctx z.Ctx) bool {
		// Skip validation if EndTime is nil or zero
		if dataPtr == nil || dataPtr.IsZero() {
			return true
		}

		// Get StartTime from context - might be nil
		startTimeRaw := ctx.Get("StartTime")
		if startTimeRaw == nil {
			return true
		}

		// Handle different possible types from context
		var startTime time.Time
		switch v := startTimeRaw.(type) {
		case time.Time:
			startTime = v
		case *time.Time:
			if v == nil || v.IsZero() {
				return true
			}
			startTime = *v
		default:
			return true // Unknown type, skip validation
		}

		return startTime.Before(*dataPtr)
	}),

	"EndDate": z.Time().TestFunc(func(dataPtr *time.Time, ctx z.Ctx) bool {
		// Skip validation if EndDate is nil or zero
		if dataPtr == nil || dataPtr.IsZero() {
			return true
		}

		// Get StartDate from context - might be nil
		startDateRaw := ctx.Get("StartDate")
		if startDateRaw == nil {
			return true
		}

		// Handle different possible types from context
		var startDate time.Time
		switch v := startDateRaw.(type) {
		case time.Time:
			startDate = v
		case *time.Time:
			if v == nil || v.IsZero() {
				return true
			}
			startDate = *v
		default:
			return true // Unknown type, skip validation
		}

		return startDate.Before(*dataPtr)
	}),
})

var FormSubmissionSchema = z.Struct(z.Shape{
	"ID":       z.String().Optional(),
	"FormData": AgendaEntrySchema,
	"Email":    z.String().Email(),
	"Token":    z.String().Optional(),
})
