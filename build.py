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
releases = s_gh.get(f"https://api.github.com/repos/{RUFFLE_REPO}/releases").json()
release = releases[0]
assets = s_gh.get(release["assets_url"]).json()
web_asset = list(filter(lambda k: k["name"].endswith("web-selfhosted.zip"), assets))[0]


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
        if (path[-1].endswith(".swf") or path[-1].startswith("bgm")) and path[0] == "game-site":
            data = z.read(inf)
            opath = f"./web/{'/'.join(path[1:])}"
            os.makedirs(os.path.dirname(opath), exist_ok=True)
            with open(opath, "wb") as f:
                f.write(data)

print("Done!")
