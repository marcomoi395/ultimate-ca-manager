import { Controller, Get } from "@nestjs/common";
import { HsmService } from "./hsm.service";

@Controller("hsm")
export class HsmController {
  constructor(private readonly service: HsmService) {}

  @Get("providers")
  providers() {
    return this.service.providers();
  }

  @Get("keys")
  keys() {
    return this.service.keys();
  }
}
