import { Container, CssBaseline } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { useGetMyselfSimpleQuery } from '../../../api/generated/graphql';
import { FullscreenProgress } from '../../components/shared/FullscreenProgress';
import { HeaderMenu } from '../../components/shared/HeaderMenu';
import { LoginView } from '../login';
import { SourcesRoot } from '../sources';

const useStyles = makeStyles({
  content: {
    marginTop: '75px',
  },
});

export const Root = () => {
  const styles = useStyles();
  const { loading, data, error } = useGetMyselfSimpleQuery();

  if (loading) return <FullscreenProgress />;
  if (error) return <p>error</p>;

  if (!data || !data.me || data.me.kind !== 'admin') {
    return (
      <>
        <CssBaseline />
        <Container fixed>
          <Switch>
            <Route path='/login' component={LoginView} exact />
            <Route render={() => <Redirect to='/login' />} />
          </Switch>
        </Container>
      </>
    );
  }

  return (
    <>
      <CssBaseline />
      <HeaderMenu />
      <Container fixed className={styles.content}>
        <Switch>
          <Route path='/sources' component={SourcesRoot} />
        </Switch>
      </Container>
    </>
  );
};
