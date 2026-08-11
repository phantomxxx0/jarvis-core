export interface Tool {
  name: string;
  description: string;
  execute(params: any): Promise<any>;
}
