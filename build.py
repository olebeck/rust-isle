import requests, zipfile, io, os, shutil
s_gh = requests.Session()
s_gh.headers["Accept"] = "application/vnd.github+json"


RUFFLE_DIR = "./web/ruffle"
RUFFLE_REPO = "islehorse/ruffle"
WEB_REPO = "islehorse/HorseIsleWeb"


if os.path.exists(RUFFLE_DIR):
    print("Removing old build")
    shutil.rmtree(RUFFLE_DIR)


print("Getting release info")
releases: list = s_gh.get(f"https://api.github.com/repos/{RUFFLE_REPO}/releases").json()
if len(releases) == 0:
    print("No releases!")
    exit(0)
releases.sort(key=lambda k: -k['id'])

web_asset = None
while len(releases):
    release = releases.pop(0)
    web_assets = list(filter(lambda k: k["name"].endswith("web-selfhosted.zip"), release["assets"]))
    if len(web_assets) == 0:
        print("No web asset found in release, using older!!")
        continue
    web_asset = web_assets[0]
if not web_asset:
    print("web asset not found in any releases!")
    exit(1)

print(f"Downloading {web_asset['name']}")
r = s_gh.get(web_asset['browser_download_url']).content


print("Extracting ruffle")
with zipfile.PyZipFile(io.BytesIO(r), "r") as z:
    z.extractall(RUFFLE_DIR)


print("Getting site data")
r = s_gh.get(f"https://api.github.com/repos/{WEB_REPO}/zipball/master").content


print("extracting swfs")
with zipfile.PyZipFile(io.BytesIO(r), "r") as z:
    for inf in z.infolist():
        path = inf.filename.split("/")[1:]
        if (path[-1].endswith(".swf") or path[-1].startswith("bgm") or path[-1] == "map750.png") and path[0] == "game-site":
            data = z.read(inf)
            opath = f"./web/{'/'.join(path[1:])}"
            os.makedirs(os.path.dirname(opath), exist_ok=True)
            with open(opath, "wb") as f:
                f.write(data)

print("Done!")
