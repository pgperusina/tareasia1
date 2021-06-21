let params = new URLSearchParams(document.location.search.substring(1));
const turno = params.get("turno");
const estado = params.get("estado");


document.addEventListener("DOMContentLoaded", function() {
    let body = document.getElementsByTagName("body");
    body.innerHTML = "24";
  });