# @skillprove/permissions

Pure role rules, with no database or request access. The API's guards in `apps/api/src/lib/auth` apply them using data read from the database. Clients must never use these rules as their only protection.
