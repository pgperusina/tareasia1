
function aspirar(location, state){
    if (state=="DIRTY") return "CLEAN";
    else if (location=="A") return "RIGHT";
    else if (location=="B") return "LEFT";
}

function verificar(states){
       var location = states[0];		
       var state = states[0] == "A" ? states[1] : states[2];
       var action_result = aspirar(location, state);
       document.getElementById("log").innerHTML+="<br>Location: ".concat(location).concat(" | Action: ").concat(action_result);
       if (action_result == "CLEAN"){
         if (location == "A") states[1] = "CLEAN";
          else if (location == "B") states[2] = "CLEAN";
       }
       else if (action_result == "RIGHT") states[0] = "B";
       else if (action_result == "LEFT") states[0] = "A";
       ensuciar();		
 setTimeout(function(){ verificar(states); }, 2000);
}

ensuciar = () => {
  if (Math.floor(Math.random() * 2) == 0) states[1] = "DIRTY";
  if (Math.floor(Math.random() * 2) == 0) states[2] = "DIRTY";  
}

// 0 = dirty - 1 = clean
var states = ["A","DIRTY","CLEAN"];
verificar(states);