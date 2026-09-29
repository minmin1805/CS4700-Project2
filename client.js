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

    username = paramNum1.split("ftp://")[1].split(":")[0];
    pass = paramNum1.split("ftp://")[1].split(":")[1].split("@")[0];
    // path is everything that comes after the hostname
    path = "/" + paramNum1.split("ftp://")[1].split("@")[1].split("/").slice(1).join("/");
    hostname = paramNum1.split("ftp://")[1].split("@")[1].split("/")[0];
    return {username, pass, path, hostname};
}

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
    username = remoteFile.split("ftp://")[1].split(":")[0];
    pass = remoteFile.split("ftp://")[1].split(":")[1].split("@")[0];
    remotePath = "/" + remoteFile.split("ftp://")[1].split("@")[1].split("/").slice(1).join("/");
    hostname = remoteFile.split("ftp://")[1].split("@")[1].split("/")[0];

    return {hostname, username, pass, remotePath, localPath};
}
async function main() {
    // get the params from the command line 
    const {action, paramNum1, paramNum2} = getParamsHelper();

    // get the hostname and pass from the paramNum1/paramNum2
    if(action === "ls" || action === "mkdir" || action === "rm" || action === "rmdir") {
        const {hostname, pass, path, username} = getHostNameAndPassV1( paramNum1);
        console.log(hostname, pass, path, username);
    }
    // if cp and mv then need to know local + remote file
    else if(action === "cp" || action === "mv") {
        const {hostname, username, pass, remotePath, localPath} = getHostNameAndPassV2( action,paramNum1, paramNum2);
        console.log(hostname, pass, remotePath, localPath);
    }
    else {
        console.error("the action is wrong");
    }
    
    // connect to the server
    // const startSocket = await connectServer(hostname);
}

main();