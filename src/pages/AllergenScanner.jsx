function AllergenScanner() {
  return (
    <section>
      <header>
        <p>Allergen Scanner</p>
        <h1>Check a food image</h1>
        <p>This area will later connect to an image analysis service.</p>
      </header>

      <form>
        <label>
          Food image
          <input type="file" accept="image/*" />
        </label>
        <button type="button" disabled>
          Scan image (coming soon)
        </button>
      </form>
    </section>
  )
}

export default AllergenScanner
