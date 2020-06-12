import React from 'react';
import { Switch, Route } from 'react-router-dom';
import routes from './constants/routes.json';
import App from './containers/App';
import HomePage from './containers/HomePage';
import ManagerPage from './containers/ManagerPage';

export default function Routes() {
  return (
    <App>
      <Switch>
        {/*<Route path={routes.COUNTER} component={HomePage} />*/}
        <Route path={routes.HOME} component={ManagerPage} />
      </Switch>
    </App>
  );
}
