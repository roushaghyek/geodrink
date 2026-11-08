export type TestFn = () => void | Promise<void>;

const registry: { name: string; run: TestFn }[] = [];

export function test(name: string, run: TestFn): void {
  registry.push({ name, run });
}

export async function runAll(): Promise<void> {
  let passed = 0;
  for (const entry of registry) {
    try {
      await entry.run();
      passed += 1;
      console.log(`ok ${passed} - ${entry.name}`);
    } catch (error) {
      console.error(`not ok ${passed + 1} - ${entry.name}`);
      console.error(error);
      process.exitCode = 1;
      return;
    }
  }
  console.log(`\n${passed}/${registry.length} tests passed`);
}
