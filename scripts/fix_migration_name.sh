
order=(
    "table_user"
    "table_form_submission" 
    "table_agenda_entry"
    "table_task_table"
    "table_user_refresh_token"
    "add_starttime_to_agenda"
    "add_subtitle_in_agenda_entry"
    "add_enddate_to_agenda_entry"
    "add_venue_name_to_agenda_entry"
    "add_event_status_to_agenda"
    "add_event_owner_to_agenda"
    "rename_time_to_startdate_in_agenda_entry"
    "add_token_version_to_users"
    "add_expired_at_to_form_submission"
)

counter=1
ROOT=$(pwd)
MIGRATION_PATH="$ROOT/internal/db/migrations"
for migration in "${order[@]}"; do
    # Find the file with this migration name
    file=$(find $MIGRATION_PATH -name "*${migration}.up.sql")
    if [[ -f "$file" ]]; then
        newname=$(printf "$MIGRATION_PATH/202505180000%03d_%s.up.sql" $counter "$migration")
        mv "$file" "$newname"
        
        # Also move the down file
        downfile="${file%.up.sql}.down.sql"
        if [[ -f "$downfile" ]]; then
            newdownname=$(printf "$MIGRATION_PATH/202505180000%03d_%s.down.sql" $counter "$migration")
            mv "$downfile" "$newdownname"
        fi
        ((counter++))
    fi
done

