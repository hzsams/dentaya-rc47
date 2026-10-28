from pathlib import Path
import subprocess,time,json,sys,datetime
name=sys.argv[1];command=sys.argv[2:]
assert name.replace('-','').isalnum() and command
folder=Path('/workspace/dentaya-rc62-validation');folder.mkdir(exist_ok=True)
started=datetime.datetime.now(datetime.timezone.utc).isoformat();timer=time.monotonic()
with (folder/(name+'.txt')).open('w') as log:
 result=subprocess.run(command,cwd='/workspace/dentaya-rc47',stdout=log,stderr=subprocess.STDOUT)
record={'name':name,'command':command,'startedAt':started,'seconds':round(time.monotonic()-timer,3),'exitCode':result.returncode,'log':name+'.txt'}
(folder/(name+'-result.json')).write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record));sys.exit(result.returncode)
