import * as XLSX from "xlsx";

const ExportRoadsButton = () => {
  const exportRoads = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}geojson/solta.geojson`
      );
      const geojson = await response.json();

      const rows = geojson.features.map((feature: any) => ({
        Id: feature.properties.id,
        Naziv: feature.properties["NAZIV_CEST"]?.trim() ?? "",
        Kategorija: feature.properties.KATEG,
        Oznaka: feature.properties.OZNAKA,
        "Dužina (km)": feature.properties.DUZINA_KM,

      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 35 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ceste");

      XLSX.writeFile(workbook, "Ceste_Solta.xlsx");
    } catch (err) {
      console.error("Greška pri izvozu:", err);
    }
  };

  return (
    <button
      onClick={exportRoads}
      className="absolute top-4 left-20 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
    >
      Export u Excel
    </button>
  );
};

export default ExportRoadsButton;