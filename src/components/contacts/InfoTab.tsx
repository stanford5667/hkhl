import { useState } from 'react';
import { Contact, ContactCategory } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Edit,
  Save,
  X,
  Building2,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Tag,
  FileText,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface InfoTabProps {
  contact: Contact;
}

export function InfoTab({ contact }: InfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email || '',
    phone: contact.phone || '',
    title: contact.title || '',
    category: contact.category,
    notes: contact.notes || '',
    lender_type: contact.lender_type || '',
  });

  const handleSave = () => {
    // TODO: Implement save logic
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      category: contact.category,
      notes: contact.notes || '',
      lender_type: contact.lender_type || '',
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-foreground font-medium">Edit Contact</h4>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1.5" />
              Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Title / Role</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => setFormData({ ...formData, category: v as ContactCategory })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lender">Lender</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="board">Board</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.category === 'lender' && (
          <div className="space-y-2">
            <Label>Lender Type</Label>
            <Select
              value={formData.lender_type}
              onValueChange={(v) => setFormData({ ...formData, lender_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="private_credit">Private Credit</SelectItem>
                <SelectItem value="mezzanine">Mezzanine</SelectItem>
                <SelectItem value="asset_based">Asset-Based</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-foreground font-medium">Contact Information</h4>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit className="h-4 w-4 mr-1.5" />
          Edit
        </Button>
      </div>

      {/* Basic Info */}
      <Card className="p-4 bg-muted/30 border-border space-y-4">
        <InfoRow icon={Mail} label="Email" value={contact.email} />
        <InfoRow icon={Phone} label="Phone" value={contact.phone} />
        <InfoRow icon={Building2} label="Company" value={contact.company?.name} />
        <InfoRow icon={Tag} label="Title" value={contact.title} />
        <InfoRow
          icon={Tag}
          label="Category"
          value={
            <Badge variant="outline" className="capitalize">
              {contact.category}
            </Badge>
          }
        />
        {contact.lender_type && (
          <InfoRow
            icon={Tag}
            label="Lender Type"
            value={
              <Badge variant="outline" className="capitalize">
                {contact.lender_type.replace('_', ' ')}
              </Badge>
            }
          />
        )}
      </Card>

      {/* Notes */}
      {contact.notes && (
        <Card className="p-4 bg-muted/30 border-border">
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-foreground text-sm whitespace-pre-wrap">{contact.notes}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Metadata */}
      <Card className="p-4 bg-muted/30 border-border space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Created</span>
          <span className="text-foreground ml-auto">
            {format(new Date(contact.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Last Updated</span>
          <span className="text-foreground ml-auto">
            {format(new Date(contact.updated_at), 'MMM d, yyyy')}
          </span>
        </div>
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-foreground text-sm ml-auto">
        {typeof value === 'string' ? value : value}
      </span>
    </div>
  );
}
