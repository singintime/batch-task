import { BatchTask } from "./BatchTask";

describe("BatchTask", () => {
  jest.useFakeTimers();
  jest.spyOn(global, "setTimeout");

  it("creates", () => {
    expect(new BatchTask([], () => {}, { budget: "atomic" })).toBeTruthy();
  });

  describe("with atomic budget", () => {
    let values: number[];
    let callback: (value: number) => unknown;
    let options: { budget: "atomic" };
    let result: number[];
    let task: BatchTask<number>;

    beforeEach(() => {
      values = [1, 2, 3];
      callback = (value) => result.push(value + 1);
      options = { budget: "atomic" };
      result = [];
    });

    afterEach(() => {
      jest.clearAllTimers();
      expect.hasAssertions();
    });

    it("applies the callback function to the input array", () => {
      task = new BatchTask(values, callback, options);

      jest.runAllTimers();

      expect(result).toEqual([2, 3, 4]);
    });

    it("processes the input array items one by one", () => {
      task = new BatchTask(values, callback, options);

      expect(result).toEqual([]);

      jest.runOnlyPendingTimers();
      expect(result).toEqual([2]);

      jest.runOnlyPendingTimers();
      expect(result).toEqual([2, 3]);

      jest.runOnlyPendingTimers();
      expect(result).toEqual([2, 3, 4]);
    });

    it("resolves the done promise after processing the whole array", () => {
      const fn = jest.fn();

      task = new BatchTask(values, callback, options);

      const promise = task.done.then(() => {
        expect(result).toEqual([2, 3, 4]);
      });

      jest.runAllTimers();

      return promise;
    });

    it("can be canceled before completion", () => {
      task = new BatchTask(values, callback, options);

      task.done.catch((reason) => {
        expect(reason.message).toEqual("canceled");
        expect(result).toEqual([2, 3]);
      });

      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();

      task.cancel();

      jest.runAllTimers();
    });

    it("resolves as soon as the callback returns false", () => {
      callback = (value) => {
        result.push(value + 1);
        return value !== 2;
      };

      task = new BatchTask(values, callback, options);

      task.done.then(() => {
        expect(result).toEqual([2, 3]);
      });

      jest.runAllTimers();
    });
  });

  describe("with iterations budget", () => {
    let values: number[];
    let callback: (value: number) => unknown;
    let options: { budget: "iterations"; amount: number };
    let result: number[];
    let task: BatchTask<number>;

    beforeEach(() => {
      values = [1, 2, 3, 4, 5];
      callback = (value) => result.push(value + 1);
      options = { budget: "iterations", amount: 3 };
      result = [];
    });

    it("applies the callback function to the input array", () => {
      task = new BatchTask(values, callback, options);

      jest.runAllTimers();

      expect(result).toEqual([2, 3, 4, 5, 6]);
    });

    it("processes the input array items in chunks", () => {
      task = new BatchTask(values, callback, options);

      expect(result).toEqual([]);

      jest.runOnlyPendingTimers();
      expect(result).toEqual([2, 3, 4]);

      jest.runOnlyPendingTimers();
      expect(result).toEqual([2, 3, 4, 5, 6]);
    });

    it("resolves the done promise after processing the whole array", () => {
      task = new BatchTask(values, callback, options);

      const promise = task.done.then(() => {
        expect(result).toEqual([2, 3, 4, 5, 6]);
      });

      jest.runAllTimers();

      return promise;
    });

    it("can be canceled before completion", () => {
      task = new BatchTask(values, callback, options);

      const promise = task.done.catch((reason) => {
        expect(reason.message).toEqual("canceled");
        expect(result).toEqual([2, 3, 4]);
      });

      jest.runOnlyPendingTimers();

      task.cancel();

      jest.runAllTimers();

      return promise;
    });

    it("resolves as soon as the callback returns false", () => {
      callback = (value) => {
        result.push(value + 1);
        return value !== 2;
      };

      task = new BatchTask(values, callback, options);

      const promise = task.done.then(() => {
        expect(result).toEqual([2, 3]);
      });

      jest.runAllTimers();

      return promise;
    });
  });

  describe("with milliseconds budget", () => {
    let values: number[];
    let callback: (value: number) => unknown;
    let options: { budget: "milliseconds"; amount: number };
    let result: number[];
    let task: BatchTask<number>;
    let nowSpy: jest.SpyInstance;

    beforeEach(() => {
      nowSpy = jest.spyOn(performance, "now").mockReturnValue(0);
      values = [1, 2, 3, 4, 5];
      callback = (value) => {
        nowSpy.mockReturnValue(value * 10);
        result.push(value + 1);
      };
      options = { budget: "milliseconds", amount: 25 };
      result = [];
    });

    it("applies the callback function to the input array", () => {
      task = new BatchTask(values, callback, options);

      jest.runAllTimers();

      expect(result).toEqual([2, 3, 4, 5, 6]);
    });

    it("processes the input array items in intervals", () => {
      const logSpy = jest.spyOn(console, "log");

      task = new BatchTask(values, callback, options);

      expect(result).toEqual([]);

      jest.runOnlyPendingTimers();
      expect(result).toEqual([2, 3, 4]);

      jest.runOnlyPendingTimers();
      expect(result).toEqual([2, 3, 4, 5, 6]);
    });

    it("resolves the done promise after processing the whole array", () => {
      task = new BatchTask(values, callback, options);

      const promise = task.done.then(() => {
        expect(result).toEqual([2, 3, 4, 5, 6]);
      });

      jest.runAllTimers();

      return promise;
    });

    it("can be canceled before completion", () => {
      task = new BatchTask(values, callback, options);

      const promise = task.done.catch((reason) => {
        expect(reason.message).toEqual("canceled");
        expect(result).toEqual([2, 3, 4]);
      });

      jest.runOnlyPendingTimers();

      task.cancel();

      jest.runAllTimers();

      return promise;
    });

    it("resolves as soon as the callback returns false", () => {
      callback = (value) => {
        nowSpy.mockReturnValue(value * 10);
        result.push(value + 1);
        return value !== 2;
      };

      task = new BatchTask(values, callback, options);

      const promise = task.done.then(() => {
        expect(result).toEqual([2, 3]);
      });

      jest.runAllTimers();

      return promise;
    });
  });
});