import { PrintBatchManager } from "@/components/PrintBatchManager";

const AdminPrintBatches = () => {
  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto py-8 px-4">
        <PrintBatchManager />
      </div>
    </div>
  );
};

export default AdminPrintBatches;
