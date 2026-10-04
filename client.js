const net = require("net");
const path = require("path");
const fs = require("fs");


/*
Suggested Implementation Approach
When starting work on this project, we recommend implementing the required functionality in the following order.

Command Line Parsing. Start by writing a program that successfully implements the required command line syntax and can parse the incoming data, e.g., FTP URLs.
Connection Establishment. Add support for connecting and logging-in to an FTP server. This includes establishing a TCP control channel, correctly sending USER, PASS, TYPE, MODE, STRU, and QUIT commands. Print out responses from the server to confirm that each command is being received and interpreted correctly.
MKD and RMD. Implement support for making and deleting remote directories. These commands are simpler because they do not require a data channel. Verify that your client is working by using a standard FTP client to double check the results.
PASV and LIST. Implement support for creating a data channel, then implement the LIST command to test it.
STORE, RETR, and DELE. Complete your client by adding support for file upload, download, and deletion. Double check your implementation by comparing it to the results from a standard FTP client.
Double check that your client works successfully on a Khoury Linux machine, e.g., login.ccs.neu.edu
*/

// helper function to get the params from the command line
function getParamsHelper() {
    const commandInput = process.argv.slice(2);
    // form of the command is $ ./4700ftp [operation] [param1] [param2]
    let paramNum1;
    let paramNum2;
    let action;

    // list of actions: ls, mkdir, rm, rmdir, cp, and mv
    // check if ls 
    if(commandInput[0] === "ls") {
        action = "ls";
        paramNum1 = commandInput[1];
    }

    // check if mkdir
    else if(commandInput[0] === "mkdir") {
        action = "mkdir";
        paramNum1 = commandInput[1];
    }
    // check if rm
    else if(commandInput[0] === "rm") {
        action = "rm";
        paramNum1 = commandInput[1];
    }
    // check if rmdir
    else if(commandInput[0] === "rmdir") {
        action = "rmdir";
        paramNum1 = commandInput[1];
    }
    // check if cp
    else if(commandInput[0] === "cp") {
        action = "cp";
        paramNum1 = commandInput[1];
        paramNum2 = commandInput[2];
    }
    // check if mv
    else if(commandInput[0] === "mv") {
        action = "mv";
        paramNum1 = commandInput[1];
        paramNum2 = commandInput[2];
    }

    else {
        console.error("the action is wrong");
    }
    return {action, paramNum1, paramNum2};
}

function getHostNameAndPassV1(paramNum1) {
    // extract each part of the url ftp://bob:s3cr3t@ftp.example.com/
    let path;
    let username;
    let pass;
    let hostname;

    // first thing after the ftp://
    username = paramNum1.split("ftp://")[1].split(":")[0];
    pass = paramNum1.split("ftp://")[1].split(":")[1].split("@")[0];
    // path is stuff that comes after ftp://bob:s3cr3t@
    path = "/" + paramNum1.split("ftp://")[1].split("@")[1].split("/").slice(1).join("/");
    hostname = paramNum1.split("ftp://")[1].split("@")[1].split("/")[0];
    return {username, pass, path, hostname};
}

// helper function to get the hostname, username, pass, remotePath, and localPath
function getHostNameAndPassV2(action, paramNum1, paramNum2) {
    // extract each part of the url ftp://bob:s3cr3t@ftp.example.com/file1 file2
    let hostname;
    let username;
    let pass;
    let remoteFile;
    let localFile;
    let localPath;
    let remotePath;

    // keep the full ftp url in remoteFile so the splits below still work for upload and download
    if (paramNum1.includes("ftp://")) {
        remoteFile = paramNum1;
        localFile = paramNum2;
    } else {
        remoteFile = paramNum2;
        localFile = paramNum1;
    }

    localPath = localFile;
    // first thing after the ftp://
    username = remoteFile.split("ftp://")[1].split(":")[0];
    pass = remoteFile.split("ftp://")[1].split(":")[1].split("@")[0];
    // add "/" + stuff that comes after ftp://bob:s3cr3t@ftp.example.com/
    remotePath = "/" + remoteFile.split("ftp://")[1].split("@")[1].split("/").slice(1).join("/");
    hostname = remoteFile.split("ftp://")[1].split("@")[1].split("/")[0];

    return {hostname, username, pass, remotePath, localPath};
}

// helper function thats help to connect to server
async function connectServer(hostname, portNumber) {
    // control channel uses 21. data channel uses the PASV port
    if (portNumber === undefined) {
      portNumber = 21;
    }
    const connectInfo = { host: hostname, port: portNumber };
  
    let socket;
  
    return new Promise((resolve, reject) => {
  
        socket = net.connect(connectInfo, () => {
            resolve(socket);
        });
      // only the control channel is text. data channel is raw bytes (listing / files)
      if (portNumber === 21) {
        socket.setEncoding("utf8");
      }
      socket.on("error", (error) => {
        console.error(`error: ${error}`);
  
        reject(error);
      });
    });
  }

// helper function to receive the message back from the server
async function mesReceiveHelper(socket) {
    return new Promise((resolve, reject) => {
      let allData = "";
      socket.setEncoding("utf8");
  
      // this go in chunks
      function updateData(eachData) {
        allData += eachData;
  
        // ftp replies end with \r\n
        let containsNewLine = allData.includes("\r\n");
  
        // check if we have \r\n if not then keep adding the data
        if (containsNewLine) {
          const message = allData.substring(0, allData.indexOf("\r\n"));
          // remove the \r\n from the allData
          allData = allData.slice(allData.indexOf("\r\n") + 2);
          socket.off("data", updateData);
  
          // try/catch to catch error
          try {
            resolve(message);
          } catch (error) {
            reject(error);
          }
        }
      }
  
      socket.on("data", updateData);
    });
  }

// helper function that send the TYPE, MODE, and STRU commands
async function sendTypeModeStruCommand(socket, command) {
    socket.write(command + "\r\n");
    const message = await mesReceiveHelper(socket);
    console.log(message);
}

//helper function that helps login to the server
async function loginToServer(socket, username, pass) {
    // send the USER command
    socket.write("USER " + username + "\r\n");
    const message = await mesReceiveHelper(socket);
    console.log(message);

    if(message.includes("331")) {
        //check if there is pass
        if(pass !== "") {
            socket.write("PASS " + pass + "\r\n");
            const message = await mesReceiveHelper(socket);
            console.log(message);
        }
    }
    // send TYPE I\r\n / MODE S\r\n and STRU F\r\n commands
    await sendTypeModeStruCommand(socket, "TYPE I");
    await sendTypeModeStruCommand(socket, "MODE S");
    await sendTypeModeStruCommand(socket, "STRU F");
    
    return socket;
}   

// helper function to execute the MKD command
async function executeMkdirCommand(socket, path) {
    socket.write("MKD " + path + "\r\n");
    const message = await mesReceiveHelper(socket);
    console.log(message);
}

// helper function to execute the RM command
async function executeRmCommand(socket, path) {
    socket.write("DELE " + path + "\r\n");
    const message = await mesReceiveHelper(socket);
    console.log(message);
}

// helper function to execute the RMD command
async function executeRmdirCommand(socket, path) {
    socket.write("RMD " + path + "\r\n");
    const message = await mesReceiveHelper(socket);
    console.log(message);
}

// helper to parse the PASV info
function parsePASVInfoHelper(message) {
    const numberList = message.split("(")[1].split(")")[0].split(",");
    let firstFour = "";
    for(let i = 0; i < 4; i++) {
        firstFour += numberList[i] + ".";
    }
    //drop the last dot
    firstFour = firstFour.slice(0, -1);
    
    // last two numbers are the port
    const lastTwo = Number(numberList[4]) * 256 + Number(numberList[5]);
    return {ip: firstFour, portNum: lastTwo};
}

// helper function to create the PASV server
async function createPASVServer(socket) {
    socket.write("PASV\r\n");
    const message = await mesReceiveHelper(socket);

    const {ip, portNum} = parsePASVInfoHelper(message);
    console.log(ip, portNum);
    // now connect 2nd socket to the pasv server
    const pasvSocket = await connectServer(ip, portNum);
    return pasvSocket;
}

// helper function to read the data from data channel
async function dataChannelReadHelper(dataSocket) {

    return new Promise((resolve, reject) => {
        const chunks = [];
      dataSocket.on("data", (eachData) => {
        // keep adding the data
        chunks.push(eachData);
      });
      dataSocket.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      // if got error then reject
      dataSocket.on("error", (error) => {
        console.error(`somthing wrong with the data channel: ${error}`);

        reject(error);
      });
    });
}

// helper function to write the data to data channel
async function dataChannelWriteHelper(dataSocket, fileData) {
    return new Promise((resolve, reject) => {

      //if there is error then reject
      dataSocket.on("error", (error) => {
        console.error(`somthing wrong with the data channel: ${error}`);
        reject(error);
      });
      //if the data sent then close the data socket
      dataSocket.end(fileData, () => {
        resolve();
      });
    });
}

// helper function to send the LS command to the server
async function executeLsCommand(socket, path) {
    // open a data channel first
    const dataSocket = await createPASVServer(socket);
    //send LIST command
    socket.write("LIST " + path + "\r\n");
    const startMessage = await mesReceiveHelper(socket);
    console.log(startMessage);
    // read the info from the data channel
    const info = await dataChannelReadHelper(dataSocket);
    const doneMessage = await mesReceiveHelper(socket);
    console.log(doneMessage);
    process.stdout.write(info.toString("utf8"));
}

// helper function to execute the CP command
async function executeCpCommand(socket, remotePath, localPath, downloadOrNot) {
    // open data channel
    const dataSocket = await createPASVServer(socket);

    if (downloadOrNot) {
        // if we download then send RETR command
        socket.write("RETR " + remotePath + "\r\n");
        const startMessage = await mesReceiveHelper(socket);
        console.log(startMessage);

        const dataFromRemoteFile = await dataChannelReadHelper(dataSocket);
        //write the data to the local file
        fs.writeFileSync(localPath, dataFromRemoteFile);
        const doneMessage = await mesReceiveHelper(socket);
        console.log(doneMessage);
    } else {
        // if local file is source then send STOR command
        const localFileData = fs.readFileSync(localPath);
        socket.write("STOR " + remotePath + "\r\n");
        const startMessage = await mesReceiveHelper(socket);
        console.log(startMessage);

        await dataChannelWriteHelper(dataSocket, localFileData);
        const doneMessage = await mesReceiveHelper(socket);
        console.log(doneMessage);
    }
}

// helper function to execute the MV command
async function executeMvCommand(socket, remotePath, localPath, downloadOrNot) {
    //open data channel
    const dataSocket = await createPASVServer(socket);

    if (downloadOrNot) {
        // download first
        socket.write("RETR " + remotePath + "\r\n");
        const startMessage = await mesReceiveHelper(socket);
        console.log(startMessage);

        const dataFromRemoteFile = await dataChannelReadHelper(dataSocket);
        // write the data to local file
        fs.writeFileSync(localPath, dataFromRemoteFile);
        const doneMessage = await mesReceiveHelper(socket);
        console.log(doneMessage);

        //if source is remote then now delete it
        socket.write("DELE " + remotePath + "\r\n");
        const deleteMessage = await mesReceiveHelper(socket);
        console.log(deleteMessage);
    } else {
        //upload first
        const localFileData = fs.readFileSync(localPath);
        socket.write("STOR " + remotePath + "\r\n");
        const startMessage = await mesReceiveHelper(socket);
        console.log(startMessage);

        await dataChannelWriteHelper(dataSocket, localFileData);
        const doneMessage = await mesReceiveHelper(socket);
        console.log(doneMessage);

        //if source is local then now delete it
        fs.unlinkSync(localPath);
    }
}

// main function which will run when the program first starts
async function main() {
    // get the params from the command line 
    let hostname;
    let pass;
    let path;
    let username;
    let remotePath;
    let localPath;
    let downloadOrNot;
    const {action, paramNum1, paramNum2} = getParamsHelper();

    // get the hostname and pass from the paramNum1/paramNum2
    if(action === "ls" || action === "mkdir" || action === "rm" || action === "rmdir") {
        const parsedInfo = getHostNameAndPassV1(paramNum1);
        hostname = parsedInfo.hostname;
        pass = parsedInfo.pass;
        path = parsedInfo.path;
        username = parsedInfo.username;
    }
    // if cp and mv then need to know local + remote file
    else if(action === "cp" || action === "mv") {
        const parsedInfo = getHostNameAndPassV2(action, paramNum1, paramNum2);
        hostname = parsedInfo.hostname;
        username = parsedInfo.username;
        pass = parsedInfo.pass;
        remotePath = parsedInfo.remotePath;
        localPath = parsedInfo.localPath;
        //check if we download or upload
        downloadOrNot = paramNum1.includes("ftp://");
    }
    else {
        console.error("the action is wrong");
    }
    
    // connect to the server
    const startSocket = await connectServer(hostname);
    console.log("connected to server yayyy");

    // read hello message 
    const message = await mesReceiveHelper(startSocket);
    console.log(message);

    // login to the server
    const loginHelper = await loginToServer(startSocket, username, pass);

    // if mkdir
    if(action === "mkdir") {
         await executeMkdirCommand(startSocket, path);
    }
    // if rm
    else if(action === "rm") {
        await executeRmCommand(startSocket, path);
    }
    // if rmdir
    else if(action === "rmdir") {
        await executeRmdirCommand(startSocket, path);
    }
    // if ls (open data channel)
    else if(action === "ls") {
        await executeLsCommand(startSocket, path);
    }
    // if cp (then open data channel + then send RETR)
    else if(action === "cp") {
        await executeCpCommand(startSocket, remotePath, localPath, downloadOrNot);
    }
    // if mv
    else if(action === "mv") {
        await executeMvCommand(startSocket, remotePath, localPath, downloadOrNot);
    }

    //if reach here we send QUIT command
    await sendTypeModeStruCommand(startSocket, "QUIT");
    startSocket.end();
}

main();