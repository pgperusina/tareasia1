let params = new URLSearchParams(document.location.search.substring(1));
const turno = params.get("turno");
const estado = params.get("estado");


console.log(turno);
console.log(estado);

document.getElementById("body").innerHTML = "24";