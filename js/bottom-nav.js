const currentPage = window.location.pathname.split("/").pop();

document.querySelectorAll(".nav-item").forEach(item => {
  const page = item.getAttribute("href");
  if (page === currentPage) {
    item.classList.add("active");
  }
});
