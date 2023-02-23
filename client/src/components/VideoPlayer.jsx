import React, { useContext } from 'react';
import { Grid, Typography, Paper, makeStyles } from '@material-ui/core';

import { SocketContext } from '../Context';

const useStyles = makeStyles((theme) => ({
  video: {
    height: '480px',
    width: '640px',
    [theme.breakpoints.down('xs')]: {
      width: '300px',
    },
  },
  gridContainer: {
    justifyContent: 'center',
    [theme.breakpoints.down('xs')]: {
      flexDirection: 'column',
    },
  },
  paper: {
    padding: '10px',
    border: '2px solid black',
    margin: '10px',
  },
  overlaydiv: {
    position: 'relative',
  },
  canvas: {
    width: '640px',
    height: '480px',
    position: 'absolute',
    top: '0',
    left: '0',
  },
}));
  

const VideoPlayer = () => {
  const { name, callAccepted, myVideo, userVideo, callEnded, stream, call, canvasRef,receiver } = useContext(SocketContext);
  const classes = useStyles();

  return (
    <Grid container className={classes.gridContainer}>
      {stream && (
        <Paper className={classes.paper}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>{name || 'Name'}</Typography>
            <video playsInline muted ref={myVideo} autoPlay className={classes.video} />
          </Grid>
        </Paper>
      )}
      {callAccepted && !callEnded && (
        <Paper className={classes.paper}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>{ receiver || call.name || 'Name'}</Typography>
            <div className={classes.overlaydiv}>
              <video playsInline ref={userVideo} autoPlay className={classes.video} />
              <canvas ref={canvasRef} className={classes.canvas}></canvas>
            </div>
          </Grid>
        </Paper>
      )}
    </Grid>
  );
};

export default VideoPlayer;
