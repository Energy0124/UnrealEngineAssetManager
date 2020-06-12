import React, { ChangeEvent, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import routes from '../constants/routes.json';
import fs from 'fs';
import path from 'path';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import CameraIcon from '@material-ui/icons/PhotoCamera';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import CssBaseline from '@material-ui/core/CssBaseline';
import Grid from '@material-ui/core/Grid';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Link from '@material-ui/core/Link';
import { IconButton, RadioGroup } from '@material-ui/core';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import InfoIcon from '@material-ui/icons/InfoOutlined';
import TextField from '@material-ui/core/TextField';
import Chip from '@material-ui/core/Chip';
import Avatar from '@material-ui/core/Avatar';
import Paper from '@material-ui/core/Paper';
import ButtonBase from '@material-ui/core/ButtonBase';
import ListSubheader from '@material-ui/core/ListSubheader';
import GridListTile from '@material-ui/core/GridListTile';
import GridList from '@material-ui/core/GridList';
import GridListTileBar from '@material-ui/core/GridListTileBar';
import Tooltip from '@material-ui/core/Tooltip';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
// import { FixedSizeGrid } from 'react-window';

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
let tagCounts: Map<string, number> = new Map<string, number>();
let tagsOrderByCount: [string, number][] = [];
let categories: Set<string> = new Set<string>();
let vaultData: any[] = [];
let assetData: any[] = [];
let loadedAssetId: string[] = [];
let fakeJar: { [x: string]: any; } = {};
let loginWindow: Electron.BrowserWindow;
let category = '';

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="https://material-ui.com/">
        Energy0124
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const useStyles = makeStyles((theme) => ({
  chipRoot: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    '& > *': {
      margin: theme.spacing(0.5)
    }
  },
  gridRoot: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper
  },
  gridList: {
    width: '100%',
    margin: 5
  },
  gridIcon: {
    color: 'rgba(255, 255, 255, 0.54)'
  },
  root: {
    display: 'flex'
  },
  details: {
    display: 'flex',
    flexDirection: 'column'
  },
  content: {
    // flex: '1 0 auto'
  },
  cover: {
    width: 151
  },
  img: {
    margin: 'auto',
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%'
  },
  image: {
    width: 128,
    height: 128
  },
  paper: {
    maxWidth: 300,
    maxHeight: 300
  },
  icon: {
    marginRight: theme.spacing(2)
  },
  heroContent: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(8, 0, 6)
  },
  heroButtons: {
    marginTop: theme.spacing(4)
  },
  cardGrid: {
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(8)
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  cardMedia: {
    paddingTop: '56.25%' // 16:9
  },
  cardContent: {
    flexGrow: 1
  },
  cardTitle: {
    fontSize: 14
  },
  footer: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(6)
  }
}));


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
    let cat = '';
    for (const category of assetInfo.data.categories) {
      let c = category.name.toLowerCase();
      myTags.add(c);
      categories.add(c);
      cat = c;
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
    assetInfo.data.category = cat;
    assetInfo.data.allTags = Array.from(myTags);
    // console.log(assetInfo.data.allTags);
    for (const myTag of myTags) {
      tags.add(myTag);
      if (tagCounts.has(myTag)) {
        let oldCount = tagCounts.get(myTag);
        if (!oldCount) {
          oldCount = 0;
        }
        tagCounts.set(myTag, oldCount + 1);
      } else {
        tagCounts.set(myTag, 1);
      }
    }

    if (assetInfo.data.allTags) {
      continue;
    }
    await fsAsync.writeFile(assetDataPath, JSON.stringify(assetInfo));

  }
  tagsOrderByCount = [...tagCounts.entries()].sort(([_a1, a2], [_a2, b2]) => b2 - a2);
  console.log(tagsOrderByCount);
  //
  // console.log(tags);
  // console.log(categories);
}

async function downloadAssetsData() {
  assetData = [];
  loadedAssetId = [];
  if (!fs.existsSync(assetDataFolder)) {
    await fsAsync.mkdir(assetDataFolder);
  }
  for (const vaultDatum of vaultData) {
    if (loadedAssetId.includes(vaultDatum.id)) {
      continue;
    }

    let assetDataPath = path.join(assetDataFolder, `${vaultDatum.id}.json`);

    if (fs.existsSync(assetDataPath)) {
      let dataString = await fsAsync.readFile(assetDataPath, 'utf8');
      if (dataString.trim()) {
        // console.log(`Vault already have data, skipping data download for ${vaultDatum.title}`);
        try {
          let data = JSON.parse(dataString);
          loadedAssetId.push(data.data.id);
          assetData.push(data);
          // console.log(data);
          continue;
        } catch (e) {
          console.log(e);
        }
        // if (data.status) {
        //   data = data.data;
        //   await fsAsync.writeFile(assetDataPath, JSON.stringify(data));
        // }

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
    // console.log(data);
    await fsAsync.writeFile(assetDataPath, JSON.stringify(data));
  }
  console.log(`done loading assetData`);
  console.log(assetData);


}

async function downloadVaultData(forceUpdate: boolean) {
  let vault: any[];
  vaultData = [];
  let vaultString: string = '';
  if (!fs.existsSync(cacheDir)) {
    await fsAsync.mkdir(cacheDir);
  }
  if (fs.existsSync(vaultPath)) {
    vaultString = await fsAsync.readFile(vaultPath, 'utf8');
  }
  if (!forceUpdate && vaultString.trim()) {
    console.log(`Vault already have data, skipping download`);
    vault = JSON.parse(vaultString);
    vaultData = vault;
    // console.log(vault);
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

let filterCache = '';

export default function Manager(props: Props) {
  // const {
  //   counter
  // } = props;

  // console.log(props);

  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [ascending, setAscending] = useState(false);


  let initialState: any[] = [];
  const [filteredData, setFilteredData] = useState(initialState);
  const classes = useStyles();
  useEffect(() => {

    const fetchData = async () => {
      // console.log(vaultData);
      // console.log(vaultData === []);
      if (vaultData.length <= 0) {
        console.log('do downloadVaultData');
        await downloadVaultData(false);
        await downloadAssetsData();
        await collectTags();
        // console.log(vaultData);
      }

      console.log(filter);

      const lowercasedFilter = filter.toLowerCase();
      const lowercasedCategoryFilter = categoryFilter.toLowerCase();
      const lowercasedTypeFilter = typeFilter.toLowerCase();
      let data = assetData;
      if (lowercasedCategoryFilter.trim() !== '') {
        data = assetData
          .filter(value => value.data.categories
            .map((x: any) => x.name.toLowerCase())
            .some((v: any) => v.includes(lowercasedCategoryFilter)));
      }
      if (lowercasedTypeFilter.trim() !== '') {
        data = data
          .filter(value => value.data.distributionMethod?.toLowerCase().includes(lowercasedTypeFilter));
      }
      if (lowercasedFilter.trim() !== '') {
        data = data
          .filter(item => {
            return item.data.allTags.some((t: string) => t.includes(lowercasedFilter));
          });
      }
      let sortedData: any[] = [];
      console.log(sortBy);
      switch (sortBy) {
        case '':
          sortedData = [...data];
          break;
        case 'purchaseDate':
          sortedData = [...data];
          break;
        case 'price':
          sortedData = [...data].sort((a, b) => a.data.priceValue - b.data.priceValue);
          break;
        case 'alphabetical':
          sortedData = [...data].sort((a, b) => (a.data.title.toLowerCase().localeCompare(b.data.title.toLowerCase())));
          break;
        default:
          sortedData = [...data];
          break;
      }
      if (!ascending) {
        sortedData = sortedData.reverse();
      }
      setFilteredData(sortedData);
      console.log(sortedData);
    };

    fetchData();
  }, [filter, categoryFilter, typeFilter, sortBy, ascending]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    let value = event.target.value;
    filterCache = value;
    setFilter(value);
  }


  return (
    <React.Fragment>
      <CssBaseline/>
      <AppBar position="relative">
        <Toolbar>
          {/*<IconButton color="secondary" aria-label="go back" component={RouterLink} to={routes.HOME}>*/}
          {/*  <ArrowBackIcon className={classes.icon}/>*/}
          {/*</IconButton>*/}
          {/*<CameraIcon className={classes.icon}/>*/}
          <Typography variant="h6" color="inherit" noWrap>
            Unreal Asset Manager
          </Typography>
        </Toolbar>
      </AppBar>
      <main>
        {/* Hero unit */}
        <div className={classes.heroContent}>
          <Container >
            <Typography component="h1" variant="h2" align="center" color="textPrimary" gutterBottom>
              Unreal Asset Manager
            </Typography>
            <Typography variant="h5" align="center" color="textSecondary" paragraph>
              Too Many Assets
            </Typography>
            <Typography component={'span'} variant="h5" align="center" color="textSecondary" paragraph>
              <Grid container spacing={2} justify="center">
                <Grid item>
                  <TextField value={filter} onChange={handleChange} id="outlined-basic" label="Filter"
                             variant="outlined"/>
                </Grid>
              </Grid>
            </Typography>
            <div className={classes.heroButtons}>
              <Grid container spacing={2} justify="center">
                <Grid item>
                  <Button onClick={login} variant="contained" color="primary">
                    login
                  </Button>
                </Grid>
                <Grid item>
                  <Button onClick={printCookie} variant="outlined" color="primary">
                    printCookie
                  </Button>
                </Grid>
                <Grid item>
                  <Button onClick={() => downloadVaultData(false)} variant="outlined" color="primary">
                    downloadVaultData
                  </Button>
                </Grid>
                <Grid item>
                  <Button onClick={downloadAssetsData} variant="outlined" color="primary">
                    downloadAssetsData
                  </Button>
                </Grid>
                <Grid item>
                  <Button onClick={collectTags} variant="outlined" color="primary">
                    collectTags
                  </Button>
                </Grid>
              </Grid>

              <FormControl component="fieldset">
                <FormLabel component="legend">Category</FormLabel>
                <RadioGroup row aria-label="position" name="position"
                            onChange={(_, value) => {
                              setCategoryFilter(value);
                            }} defaultValue="">
                  <FormControlLabel
                    value="2d assets"
                    control={<Radio color="primary"/>}
                    label="2d assets"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="animations"
                    control={<Radio color="primary"/>}
                    label="animations"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="animations"
                    control={<Radio color="primary"/>}
                    label="architectural visualization"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="blueprints"
                    control={<Radio color="primary"/>}
                    label="blueprints"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="characters"
                    control={<Radio color="primary"/>}
                    label="characters"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="code plugins"
                    control={<Radio color="primary"/>}
                    label="code plugins"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="environments"
                    control={<Radio color="primary"/>}
                    label="environments"
                    labelPlacement="start"
                  />

                  <FormControlLabel
                    value="epic content"
                    control={<Radio color="primary"/>}
                    label="epic content"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="materials"
                    control={<Radio color="primary"/>}
                    label="materials"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="megascans"
                    control={<Radio color="primary"/>}
                    label="megascans"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="music"
                    control={<Radio color="primary"/>}
                    label="music"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="props"
                    control={<Radio color="primary"/>}
                    label="props"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="sound effects"
                    control={<Radio color="primary"/>}
                    label="sound effects"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="textures"
                    control={<Radio color="primary"/>}
                    label="textures"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="visual effects"
                    control={<Radio color="primary"/>}
                    label="visual effects"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="weapons"
                    control={<Radio color="primary"/>}
                    label="weapons"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value=""
                    control={<Radio color="primary"/>}
                    label="*"
                    labelPlacement="start"
                  />


                </RadioGroup>
              </FormControl>
              <FormControl component="fieldset">
                <FormLabel component="legend">Type</FormLabel>
                <RadioGroup row aria-label="position" name="position"
                            onChange={(_, value) => {
                              setTypeFilter(value);
                            }} defaultValue="">
                  <FormControlLabel
                    value="ASSET_PACK"
                    control={<Radio color="primary"/>}
                    label="ASSET_PACK"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="COMPLETE_PROJECT"
                    control={<Radio color="primary"/>}
                    label="COMPLETE_PROJECT"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="ENGINE_PLUGIN"
                    control={<Radio color="primary"/>}
                    label="ENGINE_PLUGIN"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value=""
                    control={<Radio color="primary"/>}
                    label="*"
                    labelPlacement="start"
                  />
                </RadioGroup>
              </FormControl>
              <FormControl component="fieldset">
                <FormLabel component="legend">Sort By</FormLabel>
                <RadioGroup row aria-label="position" name="position"
                            onChange={(_, value) => {
                              setSortBy(value);
                            }} defaultValue="">
                  <FormControlLabel
                    value="purchaseDate"
                    control={<Radio color="primary"/>}
                    label="purchaseDate"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="price"
                    control={<Radio color="primary"/>}
                    label="price"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="alphabetical"
                    control={<Radio color="primary"/>}
                    label="alphabetical"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value=""
                    control={<Radio color="primary"/>}
                    label="Default"
                    labelPlacement="start"
                  />
                </RadioGroup>
              </FormControl>
              <FormControl component="fieldset">
                <FormLabel component="legend">Order</FormLabel>
                <RadioGroup row aria-label="position" name="position"
                            onChange={(_, value) => {
                              setAscending(value === 'true');
                            }} defaultValue="false">
                  <FormControlLabel
                    value="true"
                    control={<Radio color="primary"/>}
                    label="ascending"
                    labelPlacement="start"
                  />
                  <FormControlLabel
                    value="false"
                    control={<Radio color="primary"/>}
                    label="descending"
                    labelPlacement="start"
                  />
                </RadioGroup>
              </FormControl>
            </div>
          </Container>
        </div>
        <Paper>
          <div className={classes.root}>
            <GridList cellHeight={180} cols={6} className={classes.gridList}>
              {filteredData.map((item) => (
                <GridListTile key={item.data.id}>

                  <img title={item.data.title} src={item.data.thumbnail} alt={item.data.title}/>

                  <GridListTileBar
                    title={
                      <Link underline='none' color='inherit'
                            href={`com.epicgames.launcher://ue/marketplace/item/${item.data.catalogItemId}`}>
                        <b>{item.data.title}</b>
                      </Link>}
                    subtitle={<Tooltip
                      title={item.data.allTags.join(', ')}><span>{item.data.categories.map((x: any) => x.name).join(', ')}</span></Tooltip>}
                    actionIcon={
                      <Tooltip title={item.data.description}>
                        <IconButton aria-label={item.data.title} className={classes.icon}>
                          <InfoIcon style={{ color: 'white' }}/>
                        </IconButton>
                      </Tooltip>
                    }
                  />

                </GridListTile>
              ))}
            </GridList>
          </div>
        </Paper>
      </main>
      {/* Footer */}
      <footer className={classes.footer}>
        <Typography variant="h6" align="center" gutterBottom>
          Fin.
        </Typography>
        <Typography variant="subtitle1" align="center" color="textSecondary" component="p">
          Don't look at me, baka!
        </Typography>
        <Copyright/>
      </footer>
      {/* End footer */}
    </React.Fragment>
  );
}
