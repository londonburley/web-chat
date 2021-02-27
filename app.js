/*** SETUP CURRENT ROOM ***/
let room = getAllUrlParams().room;
const title = document.getElementsByTagName("h1")[0];
if (room === undefined) {
  room = "";
  title.innerHTML = "Chat (Global)";
} else if (room === true || room.trim() === "") {
  window.location.href = "https://oskar-codes.github.io/web-chat";
} else {
  title.innerHTML = "Chat ("+ decodeURIComponent(room).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\+/g, " ") +")";
  window.document.title = decodeURIComponent(room).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\+/g, " ") +" | Oskar Codes";
}

const customName = getAllUrlParams().name;
if (customName !== undefined && customName.trim() !== "" && customName !== true) {
  title.innerHTML = `Chat (${decodeURIComponent(customName)})`
  window.document.title = decodeURIComponent(customName) + " | Oskar Codes";
}

/*** HANDLE ROOM CHANGE ***/
function changeRoom() {
  let result = prompt("Enter a room id. The room will be created if it doesn't exist. An empty room id brings you back to the global room.", decodeURIComponent(room).replace(/\+/g ," "));
  if (result != null) {
    result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    result = result.substring(0, 20);
    result = result.trim();
    if (isNullOrEmpty(result)) {
      window.location.href = "https://oskar-codes.github.io/web-chat";
    } else {
      window.location.href = "https://oskar-codes.github.io/web-chat?room=" + result;
    }
  }
}

/*** HANDLE NOTIFICATIONS PERMISSION ***/
let displayNotifications = false;
if ('Notification' in window) {
  window.setTimeout(function() {
    displayNotifications = true;
  }, 2000) 
  Notification.requestPermission().then(function(result) {
    console.log("Notifications access status: "+result);
  });
}

/*** INITIALIZE USERNAME ***/
let user = localStorage.getItem("user");
let userIp = "";
const uniqueID = localStorage.webChatID || uuidv4();
localStorage.webChatID = uniqueID;
if (!user) {
  user = prompt("Choose a username", "Guest");
  if (isNullOrEmpty(user)) {
    user = "Guest"
  }
  user = user.trim().substring(0, 35).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  localStorage.setItem("user", user);
}
document.getElementsByClassName("user")[0].innerHTML = user;

/*** CHANGE USERNAME ***/
function changeUser() {
  let newUser = prompt("Choose a username", user);
  if (newUser != null) {
    if (isNullOrEmpty(newUser)) {
      newUser = "Guest"
    }
    newUser = newUser.trim().substring(0, 35).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    user = newUser;
    localStorage.setItem("user", user);
    document.getElementsByClassName("user")[0].innerHTML = user;
  }
}

/*** FIREBASE CONFIGURATION ***/
const firebaseConfig = {
  apiKey: "AIzaSyA2OMVp6D5IksJo8EJgWsyI0UV9bm08c8A",
  authDomain: "github-web-chat.firebaseapp.com",
  databaseURL: "https://github-web-chat.firebaseio.com",
  projectId: "github-web-chat",
  storageBucket: "github-web-chat.appspot.com",
  messagingSenderId: "165990792894",
  appId: "1:165990792894:web:8f2ec6b1984e71e24ca8ef"
};
firebase.initializeApp(firebaseConfig);

/*** FORMAT MESSAGE OBJECT AND PUSH IT TO THE FIREBASE DATABASE ***/
function saveToFirebase(msg, usr) {
  const object = {
    user: usr,
    message: msg,
    attachment: 'none',
    time: getDateTime(),
    ip: userIp,
    id: uniqueID
  };

  firebase.database().ref('messages' + room).push().set(object)
  .then(function(snapshot) {
    console.log("Message successfully sent!");
  }, function(e) {
    console.log(e);
    const chat = document.getElementsByClassName("chat")[0];
    chat.innerHTML += "<p style='color: red;'><b>Your message failed to send:</b><br>"+ e +"</p><hr style='border-color: #ddd; border-style: solid;'>";
    chat.scrollBy(0, 100000);
  });
}

/*** LISTEN FOR NEW MESSAGES FROM THE FIREBASE DATABASE AND FORMAT THEM ***/
const messagesRef  = firebase.database().ref('messages' + room);
messagesRef.on('child_added', (snapshot) => {
  const chat = document.getElementsByClassName("chat")[0];
  const usr = snapshot.val().user;
  let msg = snapshot.val().message;
  const id = snapshot.val().id;
  
  msg = msg
    .replace(/</g, "&lt;") // prevent HTML tags
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g,"<b>$1</b>") // bold
    .replace(/__(.+?)__/g,"<u>$1</u>") // underline
    .replace(/~~(.+?)~~/g,"<s>$1</s>") // strikethrough
    .replace(/\*(.+?)\*/g,"<i>$1</i>") // italic
  
  let time = snapshot.val().time;
  if (usr.trim() !== "") {
    if (!isNullOrEmpty(time)) {
      time = ` (${time})`;
    }
    chat.innerHTML += `<p><b onclick="requestUser('${id}', '${usr}', '${user}');" style='cursor: pointer;'>${usr}</b>${time}:</p><p style='margin-left: 7px;'>${msg}</p><hr style='border-color: #ddd; border-style: solid;'>`;
    chat.scrollBy(0, 100000);

    /*** DISPLAY NOTIFICATION ***/
    if (displayNotifications && usr != user) {
      new Notification('Web Chat', {body: usr + ": " + msg});
    }
  }
});

/*** REQUEST PRIVATE CONVERSATION ***/
function requestUser(requestID, requestUsername, fromUsername) {
  if (requestID !== uniqueID) {
    firebase.database().ref("/broadcasts").push().set({
      request: requestID,
      fromID: uniqueID,
      from: fromUsername,
      to: requestUsername
    });
    window.open(`https://oskar-codes.github.io/web-chat?room=${mix(requestID,uniqueID)}&name=${requestUsername}`);
  }
}

/*** LISTEN FOR PRIVATE REQUESTS ***/
firebase.database().ref("/broadcasts").on('child_added', (snapshot) => {
  let val = snapshot.val();
  
  if (uniqueID === val.request) {
    if (confirm(`${val.from} requested you to join a private discussion. Join?`)) {
      window.open(`https://oskar-codes.github.io/web-chat?room=${mix(val.fromID,uniqueID)}&name=${val.from}`);
    }
  }
  console.log(snapshot)
  firebase.database().ref(snapshot.ref).set({});
});

/*** HANDLE MESSAGE BEFORE SENDING ***/
function send() {
  const msgBox = document.getElementById("message");
  let msg = msgBox.value;
  const chat = document.getElementsByClassName("chat")[0];
  if (!isNullOrEmpty(msg)) {
    msgBox.value = "";
    chat.scrollBy(0, 100000);
    msg = msg.substring(0, 200).trim();
    saveToFirebase(msg, user);
  }
}

/*** ALLOW USE OF "ENTER" KEY TO SEND MESSAGE ***/
document.getElementById("message").onkeyup = function(e) {
  if (e.key === "Enter") {
    send();
  }
}

/*** HELPER FUNCTIONS ***/
function isNullOrEmpty(str) {
  return !str || !str.trim();
}

function getIp(json) {
  userIp = json.ip;
}

function getDateTime() {
  let now     = new Date(); 
  let year    = now.getFullYear();
  let month   = now.getMonth()+1; 
  let day     = now.getDate();
  let hour    = now.getHours();
  let minute  = now.getMinutes();
  let second  = now.getSeconds(); 
  if(month.toString().length == 1) {
       month = '0'+month;
  }
  if(day.toString().length == 1) {
       day = '0'+day;
  }   
  if(hour.toString().length == 1) {
       hour = '0'+hour;
  }
  if(minute.toString().length == 1) {
       minute = '0'+minute;
  }
  if(second.toString().length == 1) {
       second = '0'+second;
  }   
  const dateTime = day+'/'+month+'/'+year+' '+hour+':'+minute;   
  return dateTime;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function mix(s1, s2) {
  let result = "";
  for (let i = 0; i < s1.length; i++) {
    result += s1.charCodeAt(i) + s2.charCodeAt(i);
  }
  return result;
}

/*function toDataURL(src, callback) {
  const request = new XMLHttpRequest();
  request.onload = function() {
    const fileReader = new FileReader();
    fileReader.onloadend = function() {
      callback(fileReader.result);
    }
    fileReader.readAsDataURL(request.response);
  }

  request.responseType = "blob";
  request.open("GET", src, true);
  request.send();
}

document.getElementById("file").onchange = function(e) {
  const path = URL.createObjectURL(e.target.files[0]);
  toDataURL(path, function(dataURL) {
    file = dataURL;
  }
}*/

function getAllUrlParams(url) {
  let queryString = url ? url.split('?')[1] : window.location.search.slice(1);
  const obj = {};
  if (queryString) {
    queryString = queryString.split('#')[0];
    const arr = queryString.split('&');
    for (var i = 0; i < arr.length; i++) {
      const a = arr[i].split('=');
      const paramName = a[0];
      const paramValue = typeof (a[1]) === 'undefined' ? true : a[1];
      //paramName = paramName.toLowerCase();
      //if (typeof paramValue === 'string') paramValue = paramValue.toLowerCase();
      if (paramName.match(/\[(\d+)?\]$/)) {
        let key = paramName.replace(/\[(\d+)?\]/, '');
        if (!obj[key]) obj[key] = [];
        if (paramName.match(/\[\d+\]$/)) {
          var index = /\[(\d+)\]/.exec(paramName)[1];
          obj[key][index] = paramValue;
        } else {
          obj[key].push(paramValue);
        }
      } else {
        if (!obj[paramName]) {
          obj[paramName] = paramValue;
        } else if (obj[paramName] && typeof obj[paramName] === 'string'){
          obj[paramName] = [obj[paramName]];
          obj[paramName].push(paramValue);
        } else {
          obj[paramName].push(paramValue);
        }
      }
    }
  }
  return obj;
}
