import React, { createContext, useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import * as tf from '@tensorflow/tfjs';
import { drawRect } from './utilities';

const SocketContext = createContext();
const socket = io('http://localhost:5000');
// const socket = io('https://warm-wildwood-81069.herokuapp.com');
// , { transports: ['websocket', 'polling', 'flashsocket'] }

const ContextProvider = ({ children }) => {
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState();
  const [name, setName] = useState('');
  const [call, setCall] = useState({});
  const [me, setMe] = useState('');
  const [receiver, setReceiver] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    socket.on('callAccepted', (data) => {
      console.log(`${data.receiverName} 1`)
      setReceiver(data.receiverName);
    });
  },[callAccepted])


  // Taking Camera permissions, setting myVideo Src, getting my id, listening for call, listening for callended
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((currentStream) => {
        setStream(currentStream);
        myVideo.current.srcObject = currentStream;
      });
    
    socket.on('me', (id) => setMe(id));
    
    socket.on('callUser', ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });
    socket.on('callEnded', () => {
      setCallEnded(true);
      window.location.reload();
      connectionRef.current.destroy();
    });
  }, []);

  // Definition of Detect Function which will take video feed, detect signs and draw on canvas
  const detect = async (net) => {
    // Check data is available

    // if (
    //   typeof webcamRef.current !== "undefined" &&
    //   webcamRef.current !== null &&
    //   webcamRef.current.video.readyState === 4
    // ) 

    if (
      typeof userVideo.current !== "undefined" &&
      userVideo.current !== null &&
      userVideo.current.readyState >= 2)  
      {
      // Get Video Properties
      // console.log(" this is where the error is")
      const video = userVideo.current;

      // Set canvas height and width
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;

      // 4. TODO - Make Detections
      const img = tf.browser.fromPixels(video);
      const resized = tf.image.resizeBilinear(img, [640,480]);
      const casted = resized.cast('int32');
      const expanded = casted.expandDims(0);
      const obj = await net.executeAsync(expanded);
      // console.log(obj)

      const boxes = await obj[1].array();
      const classes = await obj[2].array();
      const scores = await obj[4].array();

      // Draw mesh
      const ctx = canvasRef.current.getContext("2d");

      // 5. TODO - Update drawing utility
      // drawSomething(obj, ctx) 

      requestAnimationFrame(()=>{drawRect(boxes[0], classes[0], scores[0], 0.7, 640, 480, ctx)});

      tf.dispose(img);
      tf.dispose(resized);
      tf.dispose(casted);
      tf.dispose(expanded);
      tf.dispose(obj);

    }
  };
  
  // defining runCoco which loads the model and calls the detect funtion every 16.7 millisecs
  const runCoco = async () => {
    // 3. TODO - Load network 
    const net = await tf.loadGraphModel('https://tensorflowjsrealtimemodel.s3.au-syd.cloud-object-storage.appdomain.cloud/model.json');

    setInterval(() => {
      if(userVideo.current)
      {
        console.log("calling detect")
        detect(net);
      }
    }, 16.7);
    
  };

  // Use Effect to call runCoco 
  useEffect(()=>{runCoco()},[]);

  // Function used to answer a call coming from another peer

  const answerCall = () => {

    setCallAccepted(true);

    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: call.from, name });
    });

    peer.on('stream', (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  // Function used to call another peer
  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    
    peer.on('signal', (data) => {
      socket.emit('callUser', { userToCall: id, signalData: data, from: me, name });
    });

    peer.on('stream', (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    socket.on('callAccepted', (signal, data) => {
      console.log(`${data.receiverName} 1`)
      setReceiver(data.receiverName);
      // console.log(`${receiver} 2`);
      setCallAccepted(true);
      peer.signal(signal);  
    });

    connectionRef.current = peer;
  };

  // Function used to cut the call
  const leaveCall = () => {
    socket.on('disconnect');
    setCallEnded(true);
    connectionRef.current.destroy();
    window.location.reload();
  };

  return (
    <SocketContext.Provider value={{
      receiver,
      call,
      callAccepted,
      myVideo,
      userVideo,
      stream,
      name,
      setName,
      callEnded,
      me,
      callUser,
      leaveCall,
      answerCall,
      canvasRef,
    }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
