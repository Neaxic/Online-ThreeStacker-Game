const express = require('express');
const app = express();
const serv = require('http').Server(app);

const io = require('socket.io')(serv);
const PORT = process.env.PORT || 8081

var playerOne, playerTwo, playerOneScore, playerTwoScore;
var playersDead = 0;


app.use(express.static(__dirname + '/ThreeStacker'));

io.on('connection', (socket) => {
  console.log(`New connection ${socket.id}`);
  socket.on('disconnect', () => {
    if(socket.id == playerOne){
      playerOne = null
      console.log(`Player one disconnected!: ${socket.id}`);
    } else if(socket.id == playerTwo){
      playerTwo = null
      console.log(`Player two disconnected!: ${socket.id}`);
    }else {
      console.log(`User disconnected ${socket.id}`);
    }
  });

  io.to(socket.id).emit('id', socket.id);

    socket.on('Click', function(data){
      socket.broadcast.emit('newClick', data);
  })

    socket.on('playerRdy', function(data){
      if(playerOne == null && playerOne != data.id){
        playerOne = data.id
        console.log("CLIENT ONE REGISTERED: "+data.id);
      } else if(playerTwo == null && playerTwo != data.id && playerOne != data.id){
        playerTwo = data.id
        console.log("CLIENT TWO REGISTERED: "+data.id);
      } 
      
      if(playerOne != null && playerTwo != null){
        console.log("Both start");
        io.emit('allRdy', data);
      } else {
        console.log("wait");
      }
    })

    socket.on('Fail', function(data){
      if(playerOne == data.id || playerTwo == data.id){
        playersDead++;
        console.log("ONE DEAD. 1: "+playerOne +": "+playerOneScore + ", 2: "+playerTwo +", "+playerTwoScore)
        if(playerOne == data.id){
          playerOneScore = data.s;
          if(playersDead >= 2){
            if(playerOneScore > playerTwoScore){
              socket.emit('gameWON');
              socket.broadcast.emit('gameLost');
              playersDead = 0;
            } else {
              socket.emit('gameLost');
              socket.broadcast.emit('gameWON');
              playersDead = 0;
            }
          } 
        } else {
          playerTwoScore = data.s;
          console.log("PlayerTwo: " +playerTwoScore);
          if(playersDead >= 2){
            if(playerTwoScore > playerOneScore){
              socket.emit('gameWON');
              socket.broadcast.emit('gameLost');
              playersDead = 0;
            } else {
              socket.emit('gameLost');
              socket.broadcast.emit('gameWON');
              playersDead = 0;
            }
          } else {
          }
        }
      }
      });
  });

serv.listen(PORT, ()=>{
    console.log('Server started: '+PORT);
});

