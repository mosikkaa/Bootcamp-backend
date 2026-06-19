import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('topics')
  topics(@Query() query: Record<string, any>) {
    return this.catalog.topics(query);
  }

  @Get('instructors')
  instructors() {
    return this.catalog.instructors();
  }
}
