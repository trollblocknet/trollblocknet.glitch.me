  
// ************************************************************************************

//                                    FUNCTIONS

// ************************************************************************************

var Twitter = require('twitter'); 
var fs = require('fs');

module.exports = {
  
  ////////// START

// ---------------------------------------------------
// Function: 
// Description:
// Input:
// Output: N/A
// ---------------------------------------------------

retrieveTwitterBlocksAndUpdateDB: function (db,table,client){
  
  // IMPORT TWITTER BLOCKED PROFILES INTO INTO DB 
  
  client.get('/blocks/ids.json?stringify_ids=true&cursor=-1', function(error, profiles, response) {
  if(error) {

    return console.error(error);
     
  }else{
    log('[tbc.twitter] : '+table+' blocked profiles list received' );
  }
  
  updateBlockedTable(db,profiles.ids,table); 
    
  updateCSV(profiles.ids,table);
   
   return;
  //console.log(response);  // Raw response object.
  });
},

  
retrieveTwitterBlocksAndUpdateDB2: function (db,table,client){
   
  //let tmpFilePath = './public/tmp.csv';
  var csvPath = './public/tmp.csv';
  var newCsvPath = './public/'+table+'.csv';
  var fileExists = fs.existsSync(csvPath);
  var twLimitReached = getBit88(table);
  console.log("[tbc.fs] : get bit88 state --> "+twLimitReached); 
  console.log("[tbc.twitter] : fileExists --> "+ fileExists +" && twLimitReached --> "+getBit88(table));
   if (fileExists && !twLimitReached){
    fs.renameSync(csvPath,newCsvPath, function (err) {
    if (err) {console.error(err);}
    else{ console.log('[tbc.fs] : File '+csvPath+' renamed to '+newCsvPath);}
  });
  }
  
  var params = {count: '5000', cursor:  -1, stringify_ids: true};
  client.get('blocks/ids', params, function getlist(error, list, response) 	
  {
     if (error) {
       console.error(error);
       //ACTIVATE BIT 88
       console.log("[tbc.fs] : set bit88 state --> true");
       setBit88(true,table);
     }
     else
     { 
       //Delete Outdated 'filename'.csv files if exists
       console.log("[tbc.fs] : set bit88 state --> false");
       setBit88(false,table);
       updateBlockedTable(db,list.ids,table); 
       
       appendTMPCSV(list.ids,csvPath);
       /*console.log('Current cursor --> '+params.cursor);
       console.log('Next cursor --> '+list.next_cursor);*/
       
       if(list.next_cursor != 0) 
       {
         params.cursor = list.next_cursor
         client.get('blocks/ids',params, getlist);
       }
    }
  }); 
  //Once TMP.CSV gets created
  
  console.log('EXISTS ------------------->'+fs.existsSync(csvPath));
  if (fs.existsSync(csvPath)==true){
  fs.renameSync(csvPath,newCsvPath);}
},
  

  // ---------------------------------------------------
// Function: getTwitterFollowers(client,tw_userID)
// Description: downoad the followers lists of tw_userID into a CSV file
// Input: client --> Twitter API connection object 
//        tw_userID --> user to download its followers 
// Output: N/A
// ---------------------------------------------------


retrieveTwitterFollowers: function (client,screenName){
  
  // IMPORT TWITTER BLOCKED PROFILES INTO INTO DB 
  
  client.get('/followers/ids.json?cursor=-1&screen_name='+screenName+'&count=5000', function(error, profiles, response) {
  if(error) {
    //throw error  
    //let logEntry = "[tbc.twitter] : ERROR! : "+error.message;
    //log(logEntry);
    return console.error(error);
     
  }else{
    log('[tbc.twitter] : followers of '+screenName+' profiles list received' );  
  };  
  
  let filename = "followers";
  
  updateCSV(profiles.ids,filename);
   
   return;
  //console.log(response);  // Raw response object.
  
});
},

  // ---------------------------------------------------
// Function: log(String)
// Description: Shows a log event in the server log console and saves it in /app/.data/console.log with current timestamp
// Input: String --> Console message
// Output: N/A
// ---------------------------------------------------

log: function (message){
  
  var fs = require('fs');
  const path = './.data/console.log';
  let exists = fs.existsSync(path);
  var output;
  //if file ./data/console.log does not exist
  if (fs.existsSync(path) == false){
    fs.writeFile(path, timestamp()+' : '+message+'\n', (err) => {
    if (err) throw err;
    console.log(message);
    });
  } else { 
  //if it does   
    fs.appendFile(path, timestamp()+' : '+message+'\n', (err) => {
    if (err) throw err;
    console.log(message); 
    });
  }
  return;
}
  
  
  ///////////END EXPORTS
  
};

////// START LOCALS

// ---------------------------------------------------
// Function:
// Description:
// Input:
// Output:
// ---------------------------------------------------
  
var updateBlockedTable = function (db,ids,table) { 
    
    let i;
    var n = 0;
    let sql = 'INSERT INTO '+table+' (tw_userID) VALUES (?)';
    for (i=0;i<=ids.length;i++)
    {   
      //INSERT ROW 
      db.serialize(function() {
        db.run(sql,ids[i], function(err) {
          if (err) {
            //return console.error(err.message);
            //return; 
          } else {
          n++;
          
          }  
        }          
        );       
      });         
    }
    log('[tbc.sqlite] : New ' +table+ ' rows inserted -> ' + n); 
    log('[tbc.sqlite] : Total ' +table+ ' (profiles) blocked -> ' + ids.length); 
  return;
}

// ---------------------------------------------------
// Function:
// Description:
// Input:
// Output:
// ---------------------------------------------------

var appendTMPCSV = function (ids,csvPath){
  
  var wstream = fs.createWriteStream(csvPath, { 
    'flags': 'a'
    , 'mode' : 0777
    , 'encoding': null
  });
  let i;
  for (i=0;i<ids.length;i++)
  {
    wstream.write(ids[i]+'\n');
  }
  
  //wstream.write(ids+'');
  wstream.end();
}

var updateCSV = function (ids,fileName){

  var wstream = fs.createWriteStream('./public/'+fileName+'.csv');
  let i;
  for (i=0;i<ids.length;i++)
  {
    wstream.write(ids[i]+'\n');
  }
  
  //wstream.write(ids+'');
  wstream.end();
}
    
// ---------------------------------------------------
// Function: timestamp()
// Description: gets the system's current date and returns a formatted timestamp string --> [HH:MM:SS dd:mm:yy]
// Input: N/A
// Output: String --> formatted 
// ---------------------------------------------------

var timestamp = function (){
  //return "dd/mm/yy-hh:MM"; 
  
process.env.TZ = 'Europe/Madrid';   
var date = new Date();
var d = date.getDate();
var m = date.getMonth();
var y = date.getFullYear();
var H = date.getHours();
var M = date.getMinutes();

var timestamp = new String();
      
timestamp = H+':'+M+' '+d+'/'+m+'/'+y;
  
  return timestamp;
}

var log = function (message){
  
  const path = './.data/console.log';
  let exists = fs.existsSync(path);
  var output;
  //if file ./data/console.log does not exist
  if (fs.existsSync(path) == false){
    fs.writeFile(path, timestamp()+' : '+message+'\n', (err) => {
    if (err) throw err;
    console.log(message);
    });
  } else { 
  //if it does   
    fs.appendFile(path, timestamp()+' : '+message+'\n', (err) => {
    if (err) throw err;
    console.log(message); 
    });
  }
  return;
}

var move = function (oldPath, newPath, callback) {

    fs.rename(oldPath, newPath, function (err) {
        if (err) {
            if (err.code === 'EXDEV') {
                copy();
            } else {
                callback(err);
            }
            return;
        }
        callback();
    });
}

function copy() {
    var readStream = fs.createReadStream(oldPath);
    var writeStream = fs.createWriteStream(newPath);

    readStream.on('error', callback);
    writeStream.on('error', callback);

    readStream.on('close', function () {
        fs.unlink(oldPath, callback);
    });

    readStream.pipe(writeStream);
}

/*function getBit88(filename) {
  
  var state;
  // First I want to read the file
  fs.readFile('./.data/bit88_'+filename+'.txt', function read(err, data) {
      if (err) {
          throw err;
      }
      state = data;
      console.log("STATE ---------------> "+state);
      if (state == 1){
        return true;
        }
      else {
        return false;
        }
  });

}*/

function getBit88(filename){
  var state = fs.readFileSync('./.data/bit88_'+filename+'.txt','utf8');
  //console.log("STATE ---------------> "+state);
  if (state == 1){
    return true;
    }
  else {
    return false;
    }
}


function setBit88(state,filename) {
  if (state == true){
    
    fs.writeFileSync('./.data/bit88_'+filename+'.txt', "1", function(err) {
    if(err) {
        return console.log(err);
    }

    console.log('[tbc.fs] : '+filename+' Twitter account limit reached, bit88 has been enabled ');
});
  
  }
  if (state == false){
    
    fs.writeFile('./.data/bit88_'+filename+'.txt', "0", function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("[tbc.fs] : Twitter limit has not been reached yet, bit88 is disabled ");
});
  
  }
 
}
  