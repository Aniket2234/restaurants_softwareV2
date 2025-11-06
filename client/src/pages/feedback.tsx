import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFeedbackSchema, type Feedback, type InsertFeedback } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function FeedbackPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: feedbackList = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedbacks"],
  });

  const addFeedbackMutation = useMutation({
    mutationFn: async (data: InsertFeedback) => {
      return apiRequest("POST", "/api/feedbacks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      setIsAddDialogOpen(false);
      toast({ title: "Feedback added successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error adding feedback", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const addForm = useForm<InsertFeedback>({
    resolver: zodResolver(insertFeedbackSchema),
    defaultValues: {
      customerName: "",
      rating: 5,
      comment: "",
      sentiment: "Positive",
    },
  });

  const onAddSubmit = (data: InsertFeedback) => {
    addFeedbackMutation.mutate(data);
  };

  const avgRating = feedbackList.length > 0 
    ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1)
    : "0.0";

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === "Positive") return <ThumbsUp className="h-4 w-4 text-success" />;
    if (sentiment === "Negative") return <ThumbsDown className="h-4 w-4 text-danger" />;
    return <span className="h-4 w-4 text-warning">-</span>;
  };

  return (
    <div className="h-screen flex flex-col">
      <AppHeader title="Customer Feedback" />
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-8">
            <div>
              <div className="text-3xl font-bold">{avgRating}</div>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < Math.round(parseFloat(avgRating)) ? "fill-warning text-warning" : "text-muted"}`} />))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Average Rating</p>
            </div>
            <div className="flex gap-6">
              <div><div className="text-2xl font-bold text-success">{feedbackList.filter(f => f.sentiment === "Positive").length}</div><p className="text-sm text-muted-foreground">Positive</p></div>
              <div><div className="text-2xl font-bold text-warning">{feedbackList.filter(f => f.sentiment === "Neutral").length}</div><p className="text-sm text-muted-foreground">Neutral</p></div>
              <div><div className="text-2xl font-bold text-danger">{feedbackList.filter(f => f.sentiment === "Negative").length}</div><p className="text-sm text-muted-foreground">Negative</p></div>
            </div>
          </div>
          <Button onClick={() => { addForm.reset(); setIsAddDialogOpen(true); }} data-testid="button-add-feedback">
            <Plus className="h-4 w-4 mr-2" />
            Add Feedback
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading feedback...</div>
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No feedback yet. Add customer feedback to track satisfaction!
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((item) => (
              <div key={item.id} className="bg-card border border-card-border rounded-lg p-4 hover-elevate" data-testid={`feedback-${item.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{item.customerName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-0.5">{[...Array(5)].map((_, i) => (<Star key={i} className={`h-3 w-3 ${i < item.rating ? "fill-warning text-warning" : "text-muted"}`} />))}</div>
                      <span className="text-xs text-muted-foreground">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(item.sentiment)}
                    <Badge variant="outline">{item.sentiment}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{item.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-feedback">
          <DialogHeader>
            <DialogTitle>Add Customer Feedback</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-add-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-add-rating">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">5 - Excellent</SelectItem>
                        <SelectItem value="4">4 - Good</SelectItem>
                        <SelectItem value="3">3 - Average</SelectItem>
                        <SelectItem value="2">2 - Poor</SelectItem>
                        <SelectItem value="1">1 - Terrible</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="sentiment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sentiment</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-add-sentiment">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Neutral">Neutral</SelectItem>
                        <SelectItem value="Negative">Negative</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-add-comment" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addFeedbackMutation.isPending} data-testid="button-submit-add-feedback">
                  {addFeedbackMutation.isPending ? "Adding..." : "Add Feedback"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
