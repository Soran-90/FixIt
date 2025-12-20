document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    item.classList.add("tap");
    setTimeout(() => item.classList.remove("tap"), 200);
  });
});