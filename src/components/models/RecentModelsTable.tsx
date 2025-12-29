import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Model {
  id: string;
  company: string;
  type: string;
  irr?: number;
  moic?: number;
  updatedAt: string;
  owner: string;
  ownerInitials: string;
}

const models: Model[] = [
  {
    id: "1",
    company: "Acme Corp",
    type: "LBO",
    irr: 28.4,
    moic: 3.2,
    updatedAt: "2 hours ago",
    owner: "Sarah",
    ownerInitials: "SA",
  },
  {
    id: "2",
    company: "TechCo Inc",
    type: "DCF",
    updatedAt: "Yesterday",
    owner: "Mike",
    ownerInitials: "MK",
  },
  {
    id: "3",
    company: "Beta Healthcare",
    type: "Pro Forma",
    updatedAt: "3 days ago",
    owner: "Sarah",
    ownerInitials: "SA",
  },
  {
    id: "4",
    company: "Gamma LLC",
    type: "LBO",
    irr: 24.1,
    moic: 2.8,
    updatedAt: "1 week ago",
    owner: "Chris",
    ownerInitials: "CS",
  },
];

export function RecentModelsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Recent Models</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Company
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  IRR
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  MOIC
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Updated
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Owner
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr
                  key={model.id}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{model.company}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{model.type}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {model.irr ? (
                      <span className="font-mono text-success">{model.irr}%</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {model.moic ? (
                      <span className="font-mono text-foreground">{model.moic}x</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {model.updatedAt}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-secondary text-xs">
                          {model.ownerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{model.owner}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Model</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem>Export</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
