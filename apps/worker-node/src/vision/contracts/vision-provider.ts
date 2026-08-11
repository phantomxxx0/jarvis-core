export interface VisionProvider<TInput, TOutput> {
  process(input: TInput): Promise<TOutput>;
}
