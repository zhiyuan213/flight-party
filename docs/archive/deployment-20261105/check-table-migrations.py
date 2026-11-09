import pathlib,zlib,subprocess,sys
root=pathlib.Path('/opt/joyflock/flight-party/backend/src/main/resources/db/migration')
rows=subprocess.check_output(['sudo','-n','docker','exec','deploy-postgres-1','psql','-U','flightparty','-d','flightparty','-tAc',"select script||'|'||checksum from flyway_schema_history where success and checksum is not null"],text=True)
valid=True
for row in rows.splitlines():
 name,expected=row.split('|');checksum=0
 for line in (root/name).read_text(encoding='utf-8-sig').splitlines():checksum=zlib.crc32(line.encode(),checksum)
 if checksum>=2**31:checksum-=2**32
 if checksum!=int(expected):print('Mismatch:',name);valid=False
print('Existing migration checksums:', 'PASS' if valid else 'FAIL')
sys.exit(0 if valid else 1)
