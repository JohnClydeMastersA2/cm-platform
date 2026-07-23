export function BackToTop() {
  function jumpToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  return (
    <div className="mobile-back-to-top">
      <button className="btn btn-sm btn-outline-secondary" type="button" onClick={jumpToTop}>
        Back to top
      </button>
    </div>
  );
}
