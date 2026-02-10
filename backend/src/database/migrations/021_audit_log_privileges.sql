-- Defense-in-depth: make audit logs immutable for non-owners
REVOKE UPDATE, DELETE ON AuditLog FROM PUBLIC;
REVOKE UPDATE, DELETE ON SecurityLog FROM PUBLIC;
