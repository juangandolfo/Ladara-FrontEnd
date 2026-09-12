import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

const addAndApi = (spy: jest.Mock): jest.Mock => {
	const and = {
		returnValue: (value: unknown) => spy.mockReturnValue(value),
		resolveTo: (value: unknown) => spy.mockResolvedValue(value),
		callThrough: () => spy
	};

	Object.assign(spy, { and });
	return spy;
};

(globalThis as any).jasmine = {
	createSpy: (name: string) => addAndApi(jest.fn().mockName(name)),
	objectContaining: (value: unknown) => expect.objectContaining(value)
};

(globalThis as any).spyOn = (target: object, property: string) => {
	const spy = jest.spyOn(target, property as never) as unknown as jest.Mock;
	return addAndApi(spy);
};

expect.extend({
	toBeTrue: (received: unknown) => ({
		pass: received === true,
		message: () => `Expected ${received} to be true`
	}),
	toBeFalse: (received: unknown) => ({
		pass: received === false,
		message: () => `Expected ${received} to be false`
	})
});
