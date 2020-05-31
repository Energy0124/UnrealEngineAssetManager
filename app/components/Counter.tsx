import React, { ChangeEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Counter.css';
import routes from '../constants/routes.json';
import fs from 'fs';
import path from 'path';


const fsAsync = fs.promises;
const axios = require('axios').default;

const electron = require('electron');
var cacheDir = path.join('.', 'cache');
var vaultPath = path.join(cacheDir, 'vault.json');
var assetDataFolder = path.join(cacheDir, 'assets');

type Props = {

  filter: string;
  counter: number;

};


let tags: Set<string> = new Set<string>();
let categories: Set<string> = new Set<string>();
let vaultData: any[] = [];
let assetData: any[] = [];
let loadedAssetId: string[] = [];
let fakeJar: { [x: string]: any; } = {};
let loginWindow: Electron.BrowserWindow;

function isInVault(vault: any[], el: any) {
  var i;

  for (i = vault.length - 1; i >= 0; --i) {
    if (vault[i].catalogItemId === el.catalogItemId) {
      return true;
    }
  }

  return false;
}

//no tag vault data: catalogItemId
//https://www.unrealengine.com/marketplace/api/assets/item/da3c5430dc5846d3a0ec9aa0d631b820
//shop data with tag: id <== use this
//https://www.unrealengine.com/marketplace/api/assets/asset/a9ca5e1f1c9a42b59d98bccbfff06f71

async function collectTags() {
  for (const assetInfo of assetData) {
    let assetDataPath = path.join(assetDataFolder, `${assetInfo.data.id}.json`);

    let myTags: Set<string> = new Set<string>();

    myTags.add(assetInfo.data.title.toLowerCase());

    for (const category of assetInfo.data.categories) {
      let c = category.name.toLowerCase();
      myTags.add(c);
      categories.add(c);
      // console.log(`adding category ${category.name}`);
    }
    for (const tag of assetInfo.data.tags) {
      myTags.add(tag.name.toLowerCase());
      // console.log(`adding tag ${tag.name}`);

      if (tag.aliases) {
        for (const alias of tag.aliases) {
          myTags.add(alias.toLowerCase());
          // console.log(`adding alias ${alias}`);
        }
      }
    }
    assetInfo.data.allTags = Array.from(myTags);
    console.log(assetInfo.data.allTags);
    for (const myTag of myTags) {
      tags.add(myTag);
    }
    await fsAsync.writeFile(assetDataPath, JSON.stringify(assetInfo));

  }


  console.log(tags);
  console.log(categories);
}

async function downloadAssetsData() {
  assetData = [];
  loadedAssetId = [];
  for (const vaultDatum of vaultData) {
    if (loadedAssetId.includes(vaultDatum.id)) {
      continue;
    }

    let assetDataPath = path.join(assetDataFolder, `${vaultDatum.id}.json`);

    if (fs.existsSync(assetDataPath)) {
      let dataString = await fsAsync.readFile(assetDataPath, 'utf8');
      if (dataString.trim()) {
        // console.log(`Vault already have data, skipping data download for ${vaultDatum.title}`);
        let data = JSON.parse(dataString);
        // if (data.status) {
        //   data = data.data;
        //   await fsAsync.writeFile(assetDataPath, JSON.stringify(data));
        // }
        loadedAssetId.push(data.data.id);
        assetData.push(data);
        // console.log(data);
        continue;
      }
    }

    let url = `https://www.unrealengine.com/marketplace/api/assets/asset/${vaultDatum.id}`;
    console.log(`downloading data of ${vaultDatum.title} from ${url}`);
    let respond = await axios.get(url, {
      headers: {
        // Cookie: getWebCookieString()
      }
    });
    let data = respond.data.data;
    assetData.push(data);
    console.log(data);
    await fsAsync.writeFile(assetDataPath, JSON.stringify(data));
  }
  console.log(`done loading assetData`);
  console.log(assetData);


}

async function downloadVaultData(forceUpdate: boolean) {
  let vault: any[];
  vaultData = [];
  let vaultString: string = await fsAsync.readFile(vaultPath, 'utf8');
  if (!forceUpdate && vaultString.trim()) {
    console.log(`Vault already have data, skipping download`);
    vault = JSON.parse(vaultString);
    vaultData = vault;
    console.log(vault);
    return vault;
  }

  const dlCount = 100;
  let dlTotal;
  let dlIndex: number;

  if (vaultData && vaultData.length) {
    vault = vaultData;
    dlIndex = vaultData.length;
  } else {
    vault = [];
    dlIndex = 0;
  }
  let url: string;

  let haveRemaining = true;
  while (haveRemaining) {
    console.log(dlIndex);
    //debugger;
    if (dlTotal !== undefined && dlIndex >= dlTotal - 1) {
      haveRemaining = false;
    }

    url = 'https://www.unrealengine.com/marketplace/api/assets/vault?start=' + dlIndex + '&count=' + dlCount;
    console.log(`downloading from ${url}`);
    try {
      let respond = await axios.get(url, {
        headers: {
          // Cookie: getWebCookieString()
        }
      });
      let data = respond.data;
      let addedCount = 0;
      //debugger;
      console.log(data);

      dlTotal = data.data.paging.total;

      if (data.data && data.data.elements && data.data.elements.length) {
        for (const element of data.data.elements) {
          ///NOTE: If you request beyond the total number in the vault, you will get back some of the last elements.
          if (!isInVault(vault, element)) {
            vault.push(element);
            ++addedCount;
          }
        }
        if (addedCount) {
          dlIndex += addedCount;
          haveRemaining = true;
        } else {
          haveRemaining = false;

        }
      } else {
        haveRemaining = false;

      }
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  console.log('Done downloading vault');
  console.log(`saving to ${vaultPath}`);
  await fsAsync.writeFile(vaultPath, JSON.stringify(vault));
  vaultData = vault;
  console.log(vault);

  return vault;


}

function printCookie() {
  console.log(getWebCookieString());
}

function setCookiesFromBrowser(cookies: { name: string; value: any; }[]) {
  cookies.forEach(function(cookie: { name: string; value: any; }) {
    fakeJar[cookie.name] = cookie.value;
  });
}

function getWebCookieString() {
  var cookieString = '';
  var key;

  for (key in fakeJar) {
    cookieString += key + '=' + fakeJar[key] + '; ';
  }

  return cookieString;
}

async function login() {
  return new Promise<void>((resolve, reject) => {
    let contents;
    let needsToRedirect: boolean;
    let redirectTimer;
    let atLeastOnePageLoaded = false;
    let loginURL = 'https://www.unrealengine.com/login';
    let currentURL = loginURL;
    let isLoggedIn: boolean;
    let cookies: any;
    /// Another url
    /// https://www.unrealengine.com/id/login?redirectUrl=https%3A%2F%2Fwww.unrealengine.com%2Fmarketplace%2Fen-US%2Fstore&client_id=932e595bedb643d9ba56d3e1089a5c4b&noHostRedirect=true
    console.log('logging in');

    if (loginWindow) {
      try {
        loginWindow.close();
      } catch (e) {
      }
    }

    isLoggedIn = false;

    // Create the browser window.
    loginWindow = new electron.remote.BrowserWindow({
      width: 800,
      height: 800,
      // icon: p.join(__dirname, 'ue-logo.png'),
      show: true, /// Use FALSE for graceful loading
      title: 'Unreal Engine Launcher'
    });
    contents = loginWindow.webContents;

    loginWindow.loadURL(loginURL);


    loginWindow.on('closed', () => {
      if (!isLoggedIn) {
        console.error('Login window closed unexpectedly');
        reject(new Error('Login window closed unexpectedly'));
      } else {
        resolve();
      }
    });

    function onLogin() {
      console.log('Logged in');
      isLoggedIn = true;
      loginWindow.close();
      resolve();
    }

    function redirectOnLogOut() {
      if (needsToRedirect) {
        needsToRedirect = false;
        loginWindow.loadURL('https://www.unrealengine.com/login');
        console.log('Redirecting to login.');
      }
    }

    function getCookiesFromSession(cb: (err: any, sessionCookies: any) => void) {
      return loginWindow.webContents.session.cookies.get({}).then(function onget(sessionCookies) {
        cb(null, sessionCookies);
      }).catch(function onerror(err) {
        cb(err, null);
      });
    }

    function hasLoginCookie(sessionCookies: any) {
      var i;

      for (i = sessionCookies.length - 1; i >= 0; --i) {
        if (sessionCookies[i] && sessionCookies[i].name && sessionCookies[i].name.toUpperCase() === 'EPIC_SSO') {
          return true;
        }
      }

      return false;
    }


    function checkIfLoggedIn() {
      if (atLeastOnePageLoaded && currentURL.indexOf('id/login') === -1) {
        getCookiesFromSession(function onget(err, sessionCookies) {
          if (!isLoggedIn) {
            if (err) {
              console.error('Error getting cookies');
              console.error(err);
            } else {
              console.log(sessionCookies);
              if (hasLoginCookie(sessionCookies)) {

                cookies = sessionCookies;
                console.log(cookies);
                setCookiesFromBrowser(cookies);
                console.log(getWebCookieString());

                onLogin();
              }
            }
          }
        });
      }
    }


    contents.on('did-frame-navigate', function(_e, url, _code, _status, _isMainFrame, _frameProcessId, _frameRoutingId) {
      console.log('did-frame-navigate', url);
      currentURL = url;
      if (needsToRedirect) {
        redirectOnLogOut();

      } else if (!isLoggedIn) {
        checkIfLoggedIn();
      }
    });
    contents.on('did-frame-finish-load', (_e, _isMainFrame, _frameProcessId, _frameRoutingId) => {
      atLeastOnePageLoaded = true;
      console.log();
      console.log('did-frame-finish-load');
      if (!isLoggedIn) {
        checkIfLoggedIn();
      }
    });

    /// Quixel login
    /// https://www.epicgames.com/id/login?client_id=b9101103b8814baa9bb4e79e5eb107d0&response_type=code
    /// Ends here https://quixel.com/?code=812d81d1f1ad4f699091b03f0b1083d7
    contents.on('page-title-updated', function(_e, title, explicitSet) {
      console.log('page-title-updated', title, explicitSet);
      ///TODO: Make sure it goes to the right page when logging out
      ///page-title-updated Logging out... | Epic Games true
      if (typeof title === 'string' && title.indexOf('Logging out') > -1) {
        console.log('Detected logout. Will redirect to log in.');
        atLeastOnePageLoaded = false;
        /// Redirect to the login page.
        needsToRedirect = true;
        /// Sometimes it does not redirect.
        redirectTimer = setTimeout(redirectOnLogOut, 5000);
        console.log(redirectTimer);
      }
    });
  });
}


export default function Counter(props: Props) {
  const {
    counter
  } = props;
  const [filter, setFilter] = useState('');

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setFilter(event.target.value);
  }

  const lowercasedFilter = filter.toLowerCase();
  const filteredData = assetData.filter(item => {
    return item.data.allTags.some((t: string) => t.includes(lowercasedFilter));
  });
  for (const filteredDatum of filteredData) {
    if (filteredDatum.data.id == 'eda8fd090dec4999996350197caaed0b') {
      console.log(filteredDatum);
    }
  }
  for (const filteredDatum of vaultData) {
    if (filteredDatum.id == 'eda8fd090dec4999996350197caaed0b') {
      console.log(filteredDatum);
    }
  }
  console.log(filteredData);
  // console.log(vaultData);
  return (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x"/>
        </Link>
      </div>
      <div>
        <input value={filter} onChange={handleChange}/>
        {filteredData.map(item => (
          <div key={item.data.id}>
            <div>
              {item.data.title}
            </div>
          </div>
        ))}
      </div>
      <div className={`counter ${styles.counter}`} data-tid="counter">
        {counter}
      </div>
      <div className={styles.btnGroup}>
        <button
          className={styles.btn}
          onClick={() => login()}
          data-tclass="btn"
          type="button"
        >
          login
        </button>
        <button
          className={styles.btn}
          onClick={() => printCookie()}
          data-tclass="btn"
          type="button"
        >
          cookie
        </button>
        <button
          className={styles.btn}
          onClick={() => downloadVaultData(false)}
          data-tclass="btn"
          type="button"
        >
          vault
        </button>
        <button
          className={styles.btn}
          onClick={() => downloadAssetsData()}
          data-tclass="btn"
          type="button"
        >
          assets
        </button>
        <button
          className={styles.btn}
          onClick={() => collectTags()}
          data-tclass="btn"
          type="button"
        >
          tags
        </button>
      </div>
    </div>
  );
}
