import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Archive } from "lucide-react";
import { PrintBatch } from "@/types/printBatch";

export function PrintBatchManager() {
  const [batches, setBatches] = useState<PrintBatch[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<PrintBatch | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    print_date: "",
  });

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    const { data, error } = await supabase
      .from("print_batches")
      .select("*, card_count:cards(count)")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Failed to load print batches");
      return;
    }

    setBatches(
      data.map((b: any) => ({
        ...b,
        card_count: b.card_count?.[0]?.count || 0,
      }))
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Batch name is required");
      return;
    }

    if (editingBatch) {
      const { error } = await supabase
        .from("print_batches")
        .update({
          name: formData.name,
          description: formData.description || null,
          print_date: formData.print_date || null,
        })
        .eq("id", editingBatch.id);

      if (error) {
        toast.error("Failed to update batch");
        return;
      }
      toast.success("Batch updated");
    } else {
      const { error } = await supabase.from("print_batches").insert({
        name: formData.name,
        description: formData.description || null,
        print_date: formData.print_date || null,
        sort_order: batches.length,
      });

      if (error) {
        toast.error("Failed to create batch");
        return;
      }
      toast.success("Batch created");
    }

    setIsDialogOpen(false);
    setEditingBatch(null);
    setFormData({ name: "", description: "", print_date: "" });
    loadBatches();
  };

  const handleEdit = (batch: PrintBatch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      description: batch.description || "",
      print_date: batch.print_date || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (batch: PrintBatch) => {
    if (batch.card_count && batch.card_count > 0) {
      if (!confirm(`This batch contains ${batch.card_count} cards. Delete anyway? Cards will not be deleted, just unassigned.`)) {
        return;
      }
    }

    const { error } = await supabase.from("print_batches").delete().eq("id", batch.id);

    if (error) {
      toast.error("Failed to delete batch");
      return;
    }

    toast.success("Batch deleted");
    loadBatches();
  };

  const handleToggleActive = async (batch: PrintBatch) => {
    const { error } = await supabase
      .from("print_batches")
      .update({ is_active: !batch.is_active })
      .eq("id", batch.id);

    if (error) {
      toast.error("Failed to update batch");
      return;
    }

    toast.success(batch.is_active ? "Batch archived" : "Batch activated");
    loadBatches();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Print Batches</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingBatch(null);
                setFormData({ name: "", description: "", print_date: "" });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBatch ? "Edit Batch" : "Create New Batch"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Batch Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., First Print - January 2025"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes about this print run..."
                />
              </div>
              <div>
                <Label htmlFor="print_date">Print Date</Label>
                <Input
                  id="print_date"
                  type="date"
                  value={formData.print_date}
                  onChange={(e) => setFormData({ ...formData, print_date: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className={`border rounded-lg p-4 ${!batch.is_active ? "opacity-60 bg-muted/50" : ""}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{batch.name}</h3>
                {batch.description && <p className="text-sm text-muted-foreground mt-1">{batch.description}</p>}
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  {batch.print_date && <span>Print Date: {new Date(batch.print_date).toLocaleDateString()}</span>}
                  <span>{batch.card_count || 0} cards</span>
                  <span className={batch.is_active ? "text-green-600" : "text-amber-600"}>
                    {batch.is_active ? "Active" : "Archived"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(batch)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(batch)}
                >
                  <Archive className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(batch)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {batches.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No print batches yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
