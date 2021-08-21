export default class PromiseQueue {
    private running: number = 0;
    constructor(
        private concurrency = 10,
        private tasks: Array<() => Promise<any>> = []
    ) {}

    public addTask(task: () => Promise<any>) {
        this.tasks.push(task);
    }

    public async run(): Promise<any[]> {
        const results = new Array<any>();
        const promises = new Array<Promise<void>>();
        for(let i = 0; i < this.concurrency; i++) {
            promises.push(this.runNext(results));
        }
        await Promise.all(promises);
        return results;
    }

    private async runNext(results: any[]): Promise<void> {
        const task = this.tasks.pop();
        if(!task) {
            return;
        }
        this.running++;
        try {
            const res = await task();
            results.push(res);
        } catch(err) {
            throw err;
        } finally {
            this.running--;
        }
        return this.runNext(results);
    }
}
