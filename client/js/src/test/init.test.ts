import {
	describe,
	beforeAll,
	afterEach,
	afterAll,
	test,
	expect,
	vi
} from "vitest";

import { Client, client, duplicate } from "..";
import { transformed_api_info, config_response } from "./test_data";
import { initialise_server } from "./server";

const app_reference = "hmb/hello_world";
const broken_app_reference = "hmb/bye_world";

const server = initialise_server();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Client class", () => {
	describe("initialisation", () => {
		test("backwards compatibility of client using deprecated syntax", async () => {
			const app = await client(app_reference);
			expect(app.config).toEqual(config_response);
		});
		test("connecting to a running app", async () => {
			const app = await Client.connect(app_reference);
			expect(app.config).toEqual(config_response);
		});

		test("connecting successfully to a private running app", async () => {
			const app = await Client.connect("hmb/secret_world", {
				hf_token: "hf_123"
			});

			expect(app.config).toEqual({
				...config_response,
				root: "https://hmb-secret-world.hf.space"
			});
		});

		test("connecting unsuccessfully to a private running app", async () => {
			await expect(
				Client.connect("hmb/secret_world", {
					hf_token: "hf_bad_token"
				})
			).rejects.toThrow("Error: Space metadata could not be loaded.");
		});

		test("viewing the api info of a running app", async () => {
			const app = await Client.connect(app_reference);
			expect(await app.view_api()).toEqual(transformed_api_info);
		});

		test("viewing the api info of a non-existent app", async () => {
			const app = Client.connect(broken_app_reference);
			await expect(app).rejects.toThrow(
				"Could not resolve config: Error: Space metadata could not be loaded."
			);
		});
	});

	describe("duplicate", () => {
		test("backwards compatibility of duplicate using deprecated syntax", async () => {
			const app = await duplicate("gradio/hello_world", {
				hf_token: "hf_123",
				private: true,
				hardware: "cpu-basic"
			});

			expect(app.config).toEqual(config_response);
		});

		test("creating a duplicate of a running app", async () => {
			const duplicate = await Client.duplicate("gradio/hello_world", {
				hf_token: "hf_123",
				private: true,
				hardware: "cpu-basic"
			});

			expect(duplicate.config).toEqual(config_response);
		});

		test("creating a duplicate of a running app without a token", async () => {
			const duplicate = Client.duplicate("gradio/hello_world", {
				private: true,
				hardware: "cpu-basic"
			});

			await expect(duplicate).rejects.toThrow("Error: Unauthorized");
		});

		test("creating a duplicate of a broken app", async () => {
			const duplicate = Client.duplicate(broken_app_reference);

			await expect(duplicate).rejects.toThrow(
				"Space metadata could not be loaded"
			);
		});
	});

	describe("overriding the Client class", () => {
		test("overriding methods on the Client class", async () => {
			const mocked_fetch = vi.fn(
				(input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
					return Promise.resolve(
						new Response(JSON.stringify({ data: "test" }))
					);
				}
			);

			class CustomClient extends Client {
				fetch_implementation = mocked_fetch;
			}

			await CustomClient.connect("hmb/hello_world");
			expect(mocked_fetch).toHaveBeenCalled();
		});
	});
});
