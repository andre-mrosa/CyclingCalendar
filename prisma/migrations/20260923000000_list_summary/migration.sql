ALTER TABLE "Event" ADD COLUMN "listSummary" JSONB;

-- Any writer (scraper, repair, admin or SQL) invalidates the derived list data.
-- Updating the summary itself leaves both the summary and updatedAt intact.
CREATE FUNCTION invalidate_event_list_summary() RETURNS trigger AS $$
BEGIN
    IF ROW(NEW."programa", NEW."prices", NEW."title", NEW."details", NEW."regiao", NEW."distrito", NEW."ambito", NEW."organizador", NEW."registrationOpensAt", NEW."registrationClosesAt")
       IS DISTINCT FROM
       ROW(OLD."programa", OLD."prices", OLD."title", OLD."details", OLD."regiao", OLD."distrito", OLD."ambito", OLD."organizador", OLD."registrationOpensAt", OLD."registrationClosesAt") THEN
        NEW."listSummary" := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_list_summary_invalidation
BEFORE UPDATE ON "Event"
FOR EACH ROW EXECUTE FUNCTION invalidate_event_list_summary();
