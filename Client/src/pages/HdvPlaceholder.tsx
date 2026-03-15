const HdvPlaceholder = ({ title }: { title: string }) => {
  return (
    <div
      style={{
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, rgba(102,126,234,0.05), rgba(118,75,162,0.05))",
        borderRadius: 12,
        border: "1px dashed #e5e7eb",
      }}
    >
      <div style={{ textAlign: "center", color: "#64748b" }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>{title}</h2>
        <p style={{ margin: 0 }}>Tính năng đang được xây dựng. Vui lòng quay lại sau.</p>
      </div>
    </div>
  );
};

export default HdvPlaceholder;
