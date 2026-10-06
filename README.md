## High-level approach
-When the command line is executed, the first thing that runs is the main() function in client.js
-First, getParamsHelper() in main() will run to get parameters such as action, paramNum1, paramNum2.
-Then, I will have two if statements to check if the action is "ls", "mkdir", "rm", "rmdir", or "cp", "mv". If it's the first four actions, we only need to use paramNum1, and if it's "cp" or "mv", we must use both paramNum1 and paramNum2 (because there is destination and origin).
-Then, I will continue to extract parameters such as hostname, path, pass, path, and username (or add remotePath and localPath and check if we need to download for "cp" and "mv").
-After that, I create a socket (net socket, i reuse from project 1) and then wait for a hello message from server
-Then, I will use the username and password typed from the command line to log in to the server, and then, if successful, continue to execute the action that needs to be performed (I create helper functions for each action to handle them separately, such as executeRmCommand, executeLsCommand).
**For actions like "ls", "cp", and "mv", I will open an additional data channel.**
**Each helper function will work by sending the corresponding command for that action and then awaiting a message back from the server.** An exception, for example, with `cp`, we have to determine whether we need to save the file to our machine depending on whether the source file is local or remote (if the file from the server comes first, we must save it to our machine). With `mv`, if the remote file comes first, we must save it to local space and then send a DELE command to the server to delete the remote file; if the remote file comes after, I delete the local file with `fs.unlinkSync` in the final step
-Finally, send a QUIT command to the server to close the server and end an action and close the socket that was initially opened (every time an action runs, all the above steps will repeat)

## Challenges I faced
-One of the challenges I encountered was with the `mv` function. At first, I thought my `mv` function was working correctly because when I tried submitting it to GradeScope, my code was fine. It was only after a long time, after carefully checking my code again, that I realized I had to remove the origin file if it was a local file from my machine. I used the remote server with DELE but didn't realize I would also need to remove the file from my local machine if it was an origin file. This could be a major oversight, causing my mv function to malfunction if I didn't check carefully
-Another challenge was that I didn't know what to do with the data obtained from the "cp" and "mv" actions. After creating a helper function (using a data channel socket) to receive data from the server, I didn't know how to convert that data into a file on my local machine. I spent some time researching this and learned I could write a buffer using writeFileSync, but then everything made sense and I was able to complete the "cp" and "mv" functions (https://www.geeksforgeeks.org/node-js/node-js-fs-writefilesync-method/)

**Resources I used**
https://www.geeksforgeeks.org/node-js/node-js-fs-writefilesync-method/
-> I used this source to know how to write buffers to files on my local computer

https://nodejs.org/api/stream.html#event-end
-> I used this documentation, specifically the section “Event: 'end’”, to write a helper to receive data from a data channel socket

https://www.reddit.com/r/node/comments/djzznr/how_to_append_to_a_file_an_array_of_strings_while/
-> I looked at this to learn how to append parts of a buffer when they are in an array